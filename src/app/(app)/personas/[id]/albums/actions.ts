"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, personas, tracks, lyricVersions, promptVersions } from "@/db/schema";
import { generate } from "@/lib/openrouter";

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

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${albums.orderIndex}), -1) + 1` })
    .from(albums)
    .where(eq(albums.personaId, personaId));

  const [a] = await db
    .insert(albums)
    .values({
      personaId,
      title,
      eraId,
      concept: String(formData.get("concept") ?? "") || null,
      orderIndex: Number(next ?? 0),
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

export async function reorderAlbums(personaId: string, orderedIds: string[]) {
  await assertOwnsPersona(personaId);
  await Promise.all(
    orderedIds.map((id, idx) =>
      db
        .update(albums)
        .set({ orderIndex: idx })
        .where(and(eq(albums.id, id), eq(albums.personaId, personaId))),
    ),
  );
  revalidatePath(`/personas/${personaId}/albums`);
  revalidatePath(`/personas/${personaId}`);
}

/** Inline status change from list views — no full form. */
type Status = "idea" | "prompt" | "lyrics" | "demo" | "master" | "released";
const STATUSES: Status[] = ["idea", "prompt", "lyrics", "demo", "master", "released"];

export async function quickUpdateTrackStatus(
  personaId: string,
  trackId: string,
  status: string,
) {
  await assertOwnsPersona(personaId);
  if (!STATUSES.includes(status as Status)) throw new Error("Invalid status");
  await db
    .update(tracks)
    .set({ status: status as Status })
    .where(and(eq(tracks.id, trackId), eq(tracks.personaId, personaId)));
  revalidatePath(`/personas/${personaId}/tracks`);
  revalidatePath(`/personas/${personaId}`);
}

/**
 * Generate album cover art via a 2-step pipeline:
 * 1. Use OpenRouter to craft a tight visual prompt from persona DNA + album concept.
 * 2. Use Pollinations.ai (free, no key) to deterministically render an image URL.
 */
export async function generateAlbumCover(personaId: string, albumId: string) {
  await assertOwnsPersona(personaId);
  const [a] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.personaId, personaId)));
  if (!a) throw new Error("Album not found");
  const [p] = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId));
  if (!p) throw new Error("Persona not found");

  const facts = [
    `Artist: ${p.name}`,
    p.tagline ? `Tagline: ${p.tagline}` : "",
    p.genres?.length ? `Genres: ${p.genres.join(", ")}` : "",
    p.colorPalette?.length ? `Palette: ${p.colorPalette.join(", ")}` : "",
    p.visualRefs?.length ? `Visual refs: ${p.visualRefs.join(", ")}` : "",
    p.imagePromptTemplate ? `Style template: ${p.imagePromptTemplate}` : "",
    `Album: ${a.title}`,
    a.concept ? `Concept: ${a.concept}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let visualPrompt: string;
  try {
    visualPrompt = await generate({
      messages: [
        {
          role: "system",
          content:
            "You write tight, vivid image-generation prompts for album covers. Output ONE line, ~30–60 words, no preamble, no quotes. Square 1:1 composition, album-cover framing, evocative subject + mood + lighting + medium.",
        },
        { role: "user", content: facts },
      ],
      temperature: 0.85,
      max_tokens: 220,
    });
  } catch {
    // Fallback prompt if AI is unavailable.
    visualPrompt = `Album cover for "${a.title}" by ${p.name}. ${
      a.concept ?? ""
    } ${(p.colorPalette ?? []).join(" ")} ${(p.genres ?? []).join(" ")}`.trim();
  }
  visualPrompt = visualPrompt.replace(/[\r\n]+/g, " ").trim();
  if (!visualPrompt) throw new Error("Empty image prompt");

  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    visualPrompt,
  )}?width=1024&height=1024&nologo=true&seed=${seed}`;

  await db
    .update(albums)
    .set({ coverUrl: url })
    .where(and(eq(albums.id, albumId), eq(albums.personaId, personaId)));

  revalidatePath(`/personas/${personaId}/albums/${albumId}`);
  revalidatePath(`/personas/${personaId}/albums`);
}
