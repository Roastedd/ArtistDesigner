"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, personas, tracks, lyricVersions, promptVersions } from "@/db/schema";

async function assertOwnsPersona(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const [p] = await db
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) throw new Error("Not found");
  return session.user.id;
}

export async function createAlbum(personaId: string, formData: FormData) {
  await assertOwnsPersona(personaId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title required");
  const eraId = String(formData.get("eraId") ?? "") || null;
  const [a] = await db
    .insert(albums)
    .values({
      personaId,
      title,
      eraId,
      concept: String(formData.get("concept") ?? "") || null,
    })
    .returning({ id: albums.id });
  redirect(`/personas/${personaId}/albums/${a.id}`);
}

export async function createTrack(
  personaId: string,
  albumId: string | null,
  formData: FormData,
) {
  await assertOwnsPersona(personaId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title required");

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${tracks.orderIndex}), -1) + 1` })
    .from(tracks)
    .where(
      albumId
        ? and(eq(tracks.personaId, personaId), eq(tracks.albumId, albumId))
        : eq(tracks.personaId, personaId),
    );

  await db.insert(tracks).values({
    personaId,
    albumId,
    title,
    orderIndex: Number(next ?? 0),
  });

  if (albumId) revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/albums`);
  revalidatePath(`/personas/${personaId}/tracks`);
}

export async function updateAlbum(
  personaId: string,
  albumId: string,
  formData: FormData,
) {
  await assertOwnsPersona(personaId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title required");
  const concept = String(formData.get("concept") ?? "") || null;
  const coverUrl = String(formData.get("coverUrl") ?? "").trim() || null;
  const releaseDateStr = String(formData.get("releaseDate") ?? "").trim();
  const releaseDate = releaseDateStr ? new Date(releaseDateStr) : null;
  const eraId = String(formData.get("eraId") ?? "") || null;

  await db
    .update(albums)
    .set({ title, concept, coverUrl, releaseDate, eraId })
    .where(and(eq(albums.id, albumId), eq(albums.personaId, personaId)));

  revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/albums`);
}

export async function deleteAlbum(personaId: string, albumId: string) {
  await assertOwnsPersona(personaId);
  await db
    .delete(albums)
    .where(and(eq(albums.id, albumId), eq(albums.personaId, personaId)));
  revalidatePath(`/personas/${personaId}/albums`);
  redirect(`/personas/${personaId}/albums`);
}

export async function deleteTrack(
  personaId: string,
  trackId: string,
  albumId: string | null,
) {
  await assertOwnsPersona(personaId);
  // Cascade delete versions first (no DB cascade defined for these in schema)
  await db.delete(promptVersions).where(eq(promptVersions.trackId, trackId));
  await db.delete(lyricVersions).where(eq(lyricVersions.trackId, trackId));
  await db
    .delete(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.personaId, personaId)));
  if (albumId) revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/tracks`);
  revalidatePath(`/personas/${personaId}`);
}

export async function reorderTracks(
  personaId: string,
  albumId: string | null,
  orderedIds: string[],
) {
  await assertOwnsPersona(personaId);
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(tracks)
      .set({ orderIndex: i })
      .where(and(eq(tracks.id, orderedIds[i]), eq(tracks.personaId, personaId)));
  }
  if (albumId) revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/tracks`);
}
