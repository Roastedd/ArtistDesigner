import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, promptVersions, tracks } from "@/db/schema";
import { generate } from "@/lib/openrouter";
import {
  buildPersonaCore,
  sunoPromptTemplate,
  lyricsPromptTemplate,
} from "@/lib/persona-prompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { personaId, mode, brief, model, saveTo } = await req.json();
  if (!personaId || !brief || !["suno", "lyrics"].includes(mode)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let track:
    | { id: string; status: (typeof tracks.$inferSelect)["status"] }
    | undefined;
  if (saveTo?.trackId) {
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
    mode === "suno"
      ? sunoPromptTemplate(core, brief)
      : lyricsPromptTemplate(core, brief);

  let text: string;
  try {
    text = await generate({
      model,
      messages: [
        { role: "system", content: "You are a precise creative collaborator." },
        { role: "user", content: userPrompt },
      ],
      temperature: mode === "lyrics" ? 0.95 : 0.7,
      max_tokens: mode === "lyrics" ? 1800 : 700,
    });
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
          target: "suno",
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
    } else {
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

  return NextResponse.json({ text, ...(saved ? { saved } : {}) });
}
