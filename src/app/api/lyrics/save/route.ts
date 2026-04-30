import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, tracks } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  trackId: z.string().uuid(),
  body: z.string().min(1).max(20000),
  structure: z
    .array(z.object({ section: z.string(), text: z.string() }))
    .max(64)
    .optional(),
  model: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`lyrics-save:${session.user.id}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many saves. Slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid input", details: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
  const { trackId, body, structure, model } = parsed;

  try {
    const [row] = await db
      .select({ id: tracks.id, status: tracks.status })
      .from(tracks)
      .innerJoin(personas, eq(personas.id, tracks.personaId))
      .where(and(eq(tracks.id, trackId), eq(personas.userId, session.user.id)));
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [v] = await db
      .insert(lyricVersions)
      .values({
        trackId: row.id,
        body,
        structure: structure ?? [],
        model: model ?? null,
      })
      .returning({ id: lyricVersions.id });

    if (row.status === "idea" || row.status === "prompt") {
      await db.update(tracks).set({ status: "lyrics" }).where(eq(tracks.id, row.id));
    }

    return NextResponse.json({ id: v.id });
  } catch (err) {
    console.error("[lyrics/save]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
