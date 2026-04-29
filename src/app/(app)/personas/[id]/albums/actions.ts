"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";

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
  const [a] = await db
    .insert(albums)
    .values({
      personaId,
      title,
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

  await db
    .update(albums)
    .set({ title, concept, coverUrl, releaseDate })
    .where(and(eq(albums.id, albumId), eq(albums.personaId, personaId)));

  revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/albums`);
}
