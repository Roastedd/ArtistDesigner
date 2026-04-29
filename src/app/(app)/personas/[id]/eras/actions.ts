"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { eras, personas } from "@/db/schema";

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

export async function listEras(personaId: string) {
  await assertOwnsPersona(personaId);
  return db
    .select()
    .from(eras)
    .where(eq(eras.personaId, personaId))
    .orderBy(asc(eras.orderIndex));
}

export async function createEra(personaId: string, formData: FormData) {
  await assertOwnsPersona(personaId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  const description = String(formData.get("description") ?? "") || null;

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${eras.orderIndex}), -1) + 1` })
    .from(eras)
    .where(eq(eras.personaId, personaId));

  await db.insert(eras).values({
    personaId,
    name,
    description,
    orderIndex: Number(next ?? 0),
  });
  revalidatePath(`/personas/${personaId}/eras`);
}

export async function updateEra(
  personaId: string,
  eraId: string,
  formData: FormData,
) {
  await assertOwnsPersona(personaId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  const description = String(formData.get("description") ?? "") || null;
  await db
    .update(eras)
    .set({ name, description })
    .where(and(eq(eras.id, eraId), eq(eras.personaId, personaId)));
  revalidatePath(`/personas/${personaId}/eras`);
}

export async function deleteEra(personaId: string, eraId: string) {
  await assertOwnsPersona(personaId);
  await db
    .delete(eras)
    .where(and(eq(eras.id, eraId), eq(eras.personaId, personaId)));
  revalidatePath(`/personas/${personaId}/eras`);
  redirect(`/personas/${personaId}/eras`);
}

export async function reorderEras(personaId: string, orderedIds: string[]) {
  await assertOwnsPersona(personaId);
  await Promise.all(
    orderedIds.map((id, idx) =>
      db
        .update(eras)
        .set({ orderIndex: idx })
        .where(and(eq(eras.id, id), eq(eras.personaId, personaId))),
    ),
  );
  revalidatePath(`/personas/${personaId}/eras`);
}
