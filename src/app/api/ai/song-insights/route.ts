import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, promptVersions, tracks } from "@/db/schema";
import { generate, MODEL_PRESETS } from "@/lib/openrouter";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_AUDIO_ANALYSIS_BYTES = 6 * 1024 * 1024;

type InsightPayload = {
  summary: string;
  strengths: string[];
  weakPoints: string[];
  arrangementIdeas: string[];
  productionIdeas: string[];
  lyricIdeas: string[];
  hookIdeas: string[];
  nextActions: string[];
  assumptions: string[];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`ai:song-insights:${session.user.id}`, 12, 60_000);
  if (!rl.ok) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const { personaId, trackId, focus, model } = await req.json();
  if (!personaId || !trackId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [row] = await db
    .select({
      track: tracks,
      persona: {
        id: personas.id,
        name: personas.name,
        genres: personas.genres,
        vocalStyle: personas.vocalStyle,
        instrumentation: personas.instrumentation,
        mixAesthetic: personas.mixAesthetic,
        personaCore: personas.personaCore,
      },
    })
    .from(tracks)
    .innerJoin(personas, eq(personas.id, tracks.personaId))
    .where(
      and(
        eq(tracks.id, trackId),
        eq(tracks.personaId, personaId),
        eq(personas.userId, session.user.id),
      ),
    );

  if (!row) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const [latestPrompt] = await db
    .select({ body: promptVersions.body, target: promptVersions.target })
    .from(promptVersions)
    .where(eq(promptVersions.trackId, trackId))
    .orderBy(desc(promptVersions.createdAt))
    .limit(1);

  const [latestLyrics] = await db
    .select({ body: lyricVersions.body })
    .from(lyricVersions)
    .where(eq(lyricVersions.trackId, trackId))
    .orderBy(desc(lyricVersions.createdAt))
    .limit(1);

  const hasAnySongContext =
    Boolean(row.track.audioUrl) ||
    Boolean(row.track.notes?.trim()) ||
    Boolean(latestLyrics?.body?.trim());

  if (!hasAnySongContext) {
    return NextResponse.json(
      {
        error:
          "Add an uploaded audio URL, notes, or lyrics first so the analyzer has material.",
      },
      { status: 400 },
    );
  }

  let audioPart:
    | {
        type: "input_audio";
        input_audio: {
          data: string;
          format: "wav" | "mp3" | "ogg" | "flac" | "m4a" | "aac";
        };
      }
    | undefined;
  let audioContextNote = "Audio file not provided.";

  if (row.track.audioUrl) {
    try {
      const audioRes = await fetch(row.track.audioUrl, {
        signal: AbortSignal.timeout(15_000),
      });
      if (audioRes.ok) {
        const len = Number(audioRes.headers.get("content-length") ?? "0");
        if (len > 0 && len > MAX_AUDIO_ANALYSIS_BYTES) {
          audioContextNote =
            "Audio file is too large for low-cost analysis; skipped. Upload a short 30-90s excerpt for best price/quality.";
        } else {
          const contentType = audioRes.headers.get("content-type") ?? "";
          const format = inferAudioFormat(row.track.audioUrl, contentType);
          if (format) {
            const buf = Buffer.from(await audioRes.arrayBuffer());
            if (buf.byteLength <= MAX_AUDIO_ANALYSIS_BYTES) {
              audioPart = {
                type: "input_audio",
                input_audio: {
                  data: buf.toString("base64"),
                  format,
                },
              };
              audioContextNote = `Audio included (${format}, ${Math.round(buf.byteLength / 1024)}KB).`;
            } else {
              audioContextNote =
                "Audio downloaded but too large for low-cost analysis; skipped. Upload a short excerpt.";
            }
          } else {
            audioContextNote =
              "Audio format is unsupported for AI audio input; skipped. Use wav/mp3/ogg/flac/m4a/aac.";
          }
        }
      } else {
        audioContextNote = "Could not fetch audio URL for analysis.";
      }
    } catch {
      audioContextNote = "Audio fetch timed out or failed; continuing with text-only analysis.";
    }
  }

  const prompt = [
    "You are a senior A&R + producer + songwriter reviewer.",
    "Analyze the provided song context and return strict JSON only.",
    "If you cannot directly inspect audio from URL, still provide useful guidance using metadata/lyrics and list assumptions.",
    "Keep suggestions practical and specific for the next writing/production session.",
    "JSON schema:",
    '{"summary":"string","strengths":["string"],"weakPoints":["string"],"arrangementIdeas":["string"],"productionIdeas":["string"],"lyricIdeas":["string"],"hookIdeas":["string"],"nextActions":["string"],"assumptions":["string"]}',
    "",
    `Focus request: ${String(focus ?? "General song analysis + improvement ideas")}`,
    "",
    "Persona context:",
    `- Name: ${row.persona.name}`,
    `- Genres: ${(row.persona.genres ?? []).join(", ") || "not provided"}`,
    `- Vocal style: ${row.persona.vocalStyle ?? "not provided"}`,
    `- Instrumentation: ${(row.persona.instrumentation ?? []).join(", ") || "not provided"}`,
    `- Mix aesthetic: ${row.persona.mixAesthetic ?? "not provided"}`,
    `- Persona core: ${row.persona.personaCore ?? "not provided"}`,
    "",
    "Track context:",
    `- Title: ${row.track.title}`,
    `- Status: ${row.track.status}`,
    `- BPM: ${row.track.bpm ?? "not provided"}`,
    `- Key: ${row.track.keySignature ?? "not provided"}`,
    `- Duration seconds: ${row.track.durationSec ?? "not provided"}`,
    `- Notes: ${row.track.notes ?? "not provided"}`,
    `- Uploaded audio URL: ${row.track.audioUrl ?? "not provided"}`,
    `- Audio processing note: ${audioContextNote}`,
    "",
    "Latest prompt version:",
    latestPrompt
      ? `- Target: ${latestPrompt.target}\n- Body:\n${latestPrompt.body}`
      : "not provided",
    "",
    "Latest lyrics:",
    latestLyrics?.body ?? "not provided",
  ].join("\n");

  let raw = "";
  try {
    raw = await generate({
      model: model || MODEL_PRESETS.audioCheap,
      messages: [
        {
          role: "system",
          content:
            "You are a precise music analyst. If audio is included, ground your analysis in audible evidence.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...(audioPart ? [audioPart] : []),
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1200,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Song analysis failed" },
      { status: 500 },
    );
  }

  let parsed: InsightPayload;
  try {
    const obj = JSON.parse(raw) as Partial<InsightPayload>;
    parsed = {
      summary: obj.summary ?? "No summary provided.",
      strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
      weakPoints: Array.isArray(obj.weakPoints) ? obj.weakPoints : [],
      arrangementIdeas: Array.isArray(obj.arrangementIdeas) ? obj.arrangementIdeas : [],
      productionIdeas: Array.isArray(obj.productionIdeas) ? obj.productionIdeas : [],
      lyricIdeas: Array.isArray(obj.lyricIdeas) ? obj.lyricIdeas : [],
      hookIdeas: Array.isArray(obj.hookIdeas) ? obj.hookIdeas : [],
      nextActions: Array.isArray(obj.nextActions) ? obj.nextActions : [],
      assumptions: Array.isArray(obj.assumptions) ? obj.assumptions : [],
    };
  } catch {
    return NextResponse.json(
      {
        error: "Model returned invalid JSON for song insights.",
        raw,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ insights: parsed });
}

function inferAudioFormat(
  url: string,
  contentType: string,
): "wav" | "mp3" | "ogg" | "flac" | "m4a" | "aac" | null {
  const ct = contentType.toLowerCase();
  if (ct.includes("wav")) return "wav";
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("flac")) return "flac";
  if (ct.includes("mp4") || ct.includes("m4a")) return "m4a";
  if (ct.includes("aac")) return "aac";

  const u = url.toLowerCase();
  if (u.endsWith(".wav")) return "wav";
  if (u.endsWith(".mp3")) return "mp3";
  if (u.endsWith(".ogg")) return "ogg";
  if (u.endsWith(".flac")) return "flac";
  if (u.endsWith(".m4a") || u.endsWith(".mp4")) return "m4a";
  if (u.endsWith(".aac")) return "aac";
  return null;
}
