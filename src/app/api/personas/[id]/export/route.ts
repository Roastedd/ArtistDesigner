import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";import { auth } from "@/auth";
import { db } from "@/db";
import {
  personas,
  eras,
  albums,
  tracks,
  promptVersions,
  lyricVersions,
  releases,
} from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [persona] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, session.user.id)));
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [erasList, albumsList, tracksList, rels] = await Promise.all([
    db.select().from(eras).where(eq(eras.personaId, id)),
    db.select().from(albums).where(eq(albums.personaId, id)),
    db.select().from(tracks).where(eq(tracks.personaId, id)),
    db.select().from(releases).where(eq(releases.personaId, id)),
  ]);

  const trackIds = tracksList.map((t) => t.id);
  const [prompts, lyrics] =
    trackIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(promptVersions)
            .where(inArray(promptVersions.trackId, trackIds)),
          db
            .select()
            .from(lyricVersions)
            .where(inArray(lyricVersions.trackId, trackIds)),
        ])
      : [[], []];

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    persona,
    eras: erasList,
    albums: albumsList,
    tracks: tracksList,
    promptVersions: prompts,
    lyricVersions: lyrics,
    releases: rels,
  };

  const filename = `${persona.slug || "persona"}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
