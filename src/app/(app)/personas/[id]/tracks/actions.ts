"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lyricVersions, personas, promptVersions, tracks } from "@/db/schema";

type Status = "idea" | "prompt" | "lyrics" | "demo" | "master" | "released";

async function assertOwnsTrack(trackId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const [row] = await db
    .select({ personaId: tracks.personaId, userId: personas.userId })
    .from(tracks)
    .innerJoin(personas, eq(personas.id, tracks.personaId))
    .where(and(eq(tracks.id, trackId), eq(personas.userId, session.user.id)));
  if (!row) throw new Error("Not found");
  return row.personaId;
}

export async function updateTrack(trackId: string, formData: FormData) {
  const personaId = await assertOwnsTrack(trackId);
  await db
    .update(tracks)
    .set({
      title: String(formData.get("title") ?? ""),
      status: String(formData.get("status") ?? "idea") as Status,
      notes: String(formData.get("notes") ?? "") || null,
    })
    .where(eq(tracks.id, trackId));
  revalidatePath(`/personas/${personaId}/tracks/${trackId}`);
}

export async function savePromptVersion(
  trackId: string,
  data: { target: string; body: string; model?: string },
) {
  const personaId = await assertOwnsTrack(trackId);
  await db.insert(promptVersions).values({
    trackId,
    target: data.target,
    body: data.body,
    model: data.model ?? null,
  });
  // bump status if still idea
  await db
    .update(tracks)
    .set({ status: "prompt" })
    .where(and(eq(tracks.id, trackId), eq(tracks.status, "idea")));
  revalidatePath(`/personas/${personaId}/tracks/${trackId}`);
}

export async function saveLyricVersion(
  trackId: string,
  data: { body: string; model?: string },
) {
  const personaId = await assertOwnsTrack(trackId);
  await db.insert(lyricVersions).values({
    trackId,
    body: data.body,
    model: data.model ?? null,
  });
  await db
    .update(tracks)
    .set({ status: "lyrics" })
    .where(eq(tracks.id, trackId));
  revalidatePath(`/personas/${personaId}/tracks/${trackId}`);
}

export async function getTrackHistory(trackId: string) {
  await assertOwnsTrack(trackId);
  const [prompts, lyrics] = await Promise.all([
    db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.trackId, trackId))
      .orderBy(desc(promptVersions.createdAt)),
    db
      .select()
      .from(lyricVersions)
      .where(eq(lyricVersions.trackId, trackId))
      .orderBy(desc(lyricVersions.createdAt)),
  ]);
  return { prompts, lyrics };
}

export async function deletePromptVersion(trackId: string, versionId: string) {
  const personaId = await assertOwnsTrack(trackId);
  await db
    .delete(promptVersions)
    .where(and(eq(promptVersions.id, versionId), eq(promptVersions.trackId, trackId)));
  revalidatePath(`/personas/${personaId}/tracks/${trackId}`);
}

export async function deleteLyricVersion(trackId: string, versionId: string) {
  const personaId = await assertOwnsTrack(trackId);
  await db
    .delete(lyricVersions)
    .where(and(eq(lyricVersions.id, versionId), eq(lyricVersions.trackId, trackId)));
  revalidatePath(`/personas/${personaId}/tracks/${trackId}`);
}
