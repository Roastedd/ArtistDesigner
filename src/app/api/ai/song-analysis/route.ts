import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { songAnalyses } from "@/db/schema";
import { generateWithFallback, MODEL_PRESETS, type ChatMessage } from "@/lib/openrouter";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB cap on the URL we'll fetch and base64
const ALLOWED_FORMATS = ["mp3", "wav", "ogg", "flac", "m4a", "aac"] as const;
type AudioFormat = (typeof ALLOWED_FORMATS)[number];

function inferFormat(url: string, contentType: string | null): AudioFormat | null {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("mpeg") || ct.includes("mp3")) return "mp3";
  if (ct.includes("wav")) return "wav";
  if (ct.includes("ogg")) return "ogg";
  if (ct.includes("flac")) return "flac";
  if (ct.includes("mp4") || ct.includes("m4a")) return "m4a";
  if (ct.includes("aac")) return "aac";
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext && (ALLOWED_FORMATS as readonly string[]).includes(ext)) {
    return ext as AudioFormat;
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert mix and mastering engineer who reviews
AI-generated music (Suno/Udio) and gives the artist actionable feedback.
You will receive an audio file plus brief context (genre, what they're going for).

Listen carefully and judge the track on these axes (1-10):
- mixBalance: relative levels of vocals, drums, bass, other elements
- vocalClarity: vocal placement, intelligibility, sibilance, breath
- lowEnd: kick/bass clarity, mud below 200Hz, sub presence
- stereoImage: width, mono compatibility, panning
- masteringReadiness: headroom, peaks, perceived loudness for the genre
- distributionReadiness: would this pass on Spotify/Apple Music as-is?

Then summarize in 2-3 sentences, list 2-4 strengths, list 2-5 specific issues
you actually hear, list 3-6 mastering actions (concrete EQ/comp/limit moves
with frequencies and dB), and 2-4 next steps.

Return ONLY JSON matching this exact schema:
{
  "overall": <1-10 number>,
  "mixBalance": <number>,
  "vocalClarity": <number>,
  "lowEnd": <number>,
  "stereoImage": <number>,
  "masteringReadiness": <number>,
  "distributionReadiness": <number>,
  "summary": "<string>",
  "strengths": ["<string>", ...],
  "issues": ["<string>", ...],
  "masteringActions": ["<string>", ...],
  "nextSteps": ["<string>", ...]
}`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`song-analysis:${session.user.id}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many analyses. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { audioUrl, trackId, genre, notes } = body as {
    audioUrl?: unknown;
    trackId?: unknown;
    genre?: unknown;
    notes?: unknown;
  };

  if (typeof audioUrl !== "string" || !/^https?:\/\//.test(audioUrl)) {
    return NextResponse.json({ error: "audioUrl required" }, { status: 400 });
  }

  // Fetch the audio (server-side) so we can base64 it for the model.
  let audioRes: Response;
  try {
    audioRes = await fetch(audioUrl, { redirect: "follow" });
  } catch {
    return NextResponse.json({ error: "Could not fetch audio" }, { status: 400 });
  }
  if (!audioRes.ok) {
    return NextResponse.json(
      { error: `Audio fetch failed (${audioRes.status})` },
      { status: 400 },
    );
  }
  const lenHeader = audioRes.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Audio too large for analysis. Max ${MAX_BYTES / 1024 / 1024} MB. Try MP3 instead of WAV.`,
      },
      { status: 413 },
    );
  }
  const buf = Buffer.from(await audioRes.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Audio too large for analysis. Max ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 413 },
    );
  }

  const format = inferFormat(audioUrl, audioRes.headers.get("content-type"));
  if (!format) {
    return NextResponse.json(
      { error: `Unsupported audio format. Use one of: ${ALLOWED_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  const userText = [
    "Analyze this track and return JSON only.",
    typeof genre === "string" && genre ? `Genre: ${genre}` : null,
    typeof notes === "string" && notes ? `Artist notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText || "Analyze this track and return JSON only." },
        {
          type: "input_audio",
          input_audio: { data: buf.toString("base64"), format },
        },
      ],
    },
  ];

  let raw: string;
  let usedModel: string;
  try {
    const out = await generateWithFallback({
      messages,
      models: [MODEL_PRESETS.audioCheap],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });
    raw = out.content;
    usedModel = out.model;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Model returned non-JSON output", raw: raw.slice(0, 500) },
      { status: 502 },
    );
  }

  // Persist for history.
  const tId = typeof trackId === "string" && trackId ? trackId : null;
  const cGenre = typeof genre === "string" && genre ? genre.slice(0, 200) : null;
  const cNotes = typeof notes === "string" && notes ? notes.slice(0, 1000) : null;

  try {
    await db.insert(songAnalyses).values({
      userId: session.user.id,
      trackId: tId,
      audioUrl,
      contextGenre: cGenre,
      contextNotes: cNotes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: parsed as any,
      model: usedModel,
    });
  } catch (e) {
    console.error("[song-analysis] insert error:", e);
    // Non-fatal — still return the analysis.
  }

  return NextResponse.json({ ok: true, model: usedModel, result: parsed });
}
