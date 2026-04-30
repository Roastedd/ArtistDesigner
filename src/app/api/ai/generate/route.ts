import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, promptVersions, tracks } from "@/db/schema";
import { generate, generateWithFallback, DEFAULT_FALLBACK_CHAIN } from "@/lib/openrouter";
import {
  buildPersonaCore,
  promptTemplateFor,
  lyricsPromptTemplate,
  buildCorePromptTemplate,
} from "@/lib/persona-prompt";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_TARGETS = ["suno", "udio", "riffusion"] as const;
type Target = (typeof VALID_TARGETS)[number];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`ai:${session.user.id}`, 20, 60_000);
  if (!rl.ok) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const { personaId, mode, brief, model, saveTo, target, controls } = await req.json();
  if (!personaId || !["suno", "lyrics", "core"].includes(mode)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (mode !== "core" && !brief) {
    return NextResponse.json({ error: "Brief required" }, { status: 400 });
  }
  const promptTarget: Target =
    mode === "suno" && VALID_TARGETS.includes(target) ? target : "suno";

  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let track:
    | { id: string; status: (typeof tracks.$inferSelect)["status"] }
    | undefined;
  if (saveTo?.trackId && mode !== "core") {
    const [t] = await db
      .select({
        id: tracks.id,
        status: tracks.status,
        personaId: tracks.personaId,
      })
      .from(tracks)
      .where(eq(tracks.id, saveTo.trackId));
    if (!t || t.personaId !== personaId) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    track = { id: t.id, status: t.status };
  }

  const core = buildPersonaCore(p);
  const userPrompt =
    mode === "core"
      ? buildCorePromptTemplate(p)
      : mode === "suno"
        ? promptTemplateFor(promptTarget, core, brief)
        : lyricsPromptTemplate(core, brief, controls ?? {});

  let text: string;
  try {
    if (model) {
      text = await generate({
        model,
        messages: [
          { role: "system", content: "You are a precise creative collaborator." },
          { role: "user", content: userPrompt },
        ],
        temperature: mode === "lyrics" ? 0.95 : mode === "core" ? 0.6 : 0.7,
        max_tokens: mode === "lyrics" ? 1800 : mode === "core" ? 600 : 700,
      });
    } else {
      const result = await generateWithFallback({
        models: DEFAULT_FALLBACK_CHAIN,
        messages: [
          { role: "system", content: "You are a precise creative collaborator." },
          { role: "user", content: userPrompt },
        ],
        temperature: mode === "lyrics" ? 0.95 : mode === "core" ? 0.6 : 0.7,
        max_tokens: mode === "lyrics" ? 1800 : mode === "core" ? 600 : 700,
      });
      text = result.content;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }

  let saved: { id: string } | undefined;
  if (track) {
    if (mode === "suno") {
      const [row] = await db
        .insert(promptVersions)
        .values({
          trackId: track.id,
          target: promptTarget,
          body: text,
          model: model ?? null,
        })
        .returning({ id: promptVersions.id });
      saved = row;
      if (track.status === "idea") {
        await db
          .update(tracks)
          .set({ status: "prompt" })
          .where(eq(tracks.id, track.id));
      }
    } else if (mode === "lyrics") {
      const [row] = await db
        .insert(lyricVersions)
        .values({ trackId: track.id, body: text, model: model ?? null })
        .returning({ id: lyricVersions.id });
      saved = row;
      if (track.status === "idea" || track.status === "prompt") {
        await db
          .update(tracks)
          .set({ status: "lyrics" })
          .where(eq(tracks.id, track.id));
      }
    }
  }

  return NextResponse.json({ text, target: promptTarget, ...(saved ? { saved } : {}) });
}
