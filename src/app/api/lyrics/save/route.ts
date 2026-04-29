import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, tracks } from "@/db/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { trackId, body, structure, model } = await req.json();
  if (!trackId || !body) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const safeStructure: { section: string; text: string }[] = Array.isArray(
    structure,
  )
    ? structure
        .filter(
          (s: unknown): s is { section: unknown; text: unknown } =>
            typeof s === "object" && s !== null,
        )
        .map((s) => ({
          section: String(s.section ?? ""),
          text: String(s.text ?? ""),
        }))
    : [];

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
      structure: safeStructure,
      model: model ?? null,
    })
    .returning({ id: lyricVersions.id });

  if (row.status === "idea" || row.status === "prompt") {
    await db.update(tracks).set({ status: "lyrics" }).where(eq(tracks.id, row.id));
  }

  return NextResponse.json({ id: v.id });
}
