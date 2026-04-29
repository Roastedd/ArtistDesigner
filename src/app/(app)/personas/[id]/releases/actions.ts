"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, personas, releases } from "@/db/schema";
import { RELEASE_CHECKLIST } from "./checklist";

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

async function assertOwnsRelease(releaseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const [row] = await db
    .select({ personaId: releases.personaId, userId: personas.userId })
    .from(releases)
    .innerJoin(personas, eq(personas.id, releases.personaId))
    .where(
      and(eq(releases.id, releaseId), eq(personas.userId, session.user.id)),
    );
  if (!row) throw new Error("Not found");
  return row.personaId;
}

export async function createRelease(personaId: string, formData: FormData) {
  await assertOwnsPersona(personaId);
  const albumId = String(formData.get("albumId") ?? "") || null;
  const distributor = String(formData.get("distributor") ?? "") || null;
  const dateStr = String(formData.get("releaseDate") ?? "");
  const releaseDate = dateStr ? new Date(dateStr) : null;
  const [r] = await db
    .insert(releases)
    .values({
      personaId,
      albumId,
      distributor,
      releaseDate,
      checklist: {},
    })
    .returning({ id: releases.id });
  redirect(`/personas/${personaId}/releases/${r.id}`);
}

export async function updateRelease(releaseId: string, formData: FormData) {
  const personaId = await assertOwnsRelease(releaseId);
  const distributor = String(formData.get("distributor") ?? "") || null;
  const upc = String(formData.get("upc") ?? "") || null;
  const dateStr = String(formData.get("releaseDate") ?? "");
  const releaseDate = dateStr ? new Date(dateStr) : null;

  const checklist: Record<string, boolean> = {};
  for (const key of RELEASE_CHECKLIST) {
    checklist[key] = formData.get(`chk:${key}`) === "on";
  }

  await db
    .update(releases)
    .set({ distributor, upc, releaseDate, checklist })
    .where(eq(releases.id, releaseId));
  revalidatePath(`/personas/${personaId}/releases/${releaseId}`);
}

export async function getAlbumsForPersona(personaId: string) {
  await assertOwnsPersona(personaId);
  return db
    .select({ id: albums.id, title: albums.title })
    .from(albums)
    .where(eq(albums.personaId, personaId));
}

export async function deleteRelease(releaseId: string) {
  const personaId = await assertOwnsRelease(releaseId);
  await db.delete(releases).where(eq(releases.id, releaseId));
  revalidatePath(`/personas/${personaId}/releases`);
  redirect(`/personas/${personaId}/releases`);
}
