"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { slugify } from "@/lib/utils";

function csv(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createPersona(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");

  const [p] = await db
    .insert(personas)
    .values({
      userId: session.user.id,
      name,
      slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
      tagline: String(formData.get("tagline") ?? "") || null,
      bio: String(formData.get("bio") ?? "") || null,
      genres: csv(formData.get("genres")),
      vocalStyle: String(formData.get("vocalStyle") ?? "") || null,
    })
    .returning({ id: personas.id });

  redirect(`/personas/${p.id}`);
}

export async function updatePersona(personaId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(personas)
    .set({
      name: String(formData.get("name") ?? ""),
      tagline: String(formData.get("tagline") ?? "") || null,
      bio: String(formData.get("bio") ?? "") || null,
      genres: csv(formData.get("genres")),
      bpmMin: formData.get("bpmMin") ? Number(formData.get("bpmMin")) : null,
      bpmMax: formData.get("bpmMax") ? Number(formData.get("bpmMax")) : null,
      vocalStyle: String(formData.get("vocalStyle") ?? "") || null,
      instrumentation: csv(formData.get("instrumentation")),
      mixAesthetic: String(formData.get("mixAesthetic") ?? "") || null,
      colorPalette: csv(formData.get("colorPalette")),
      visualRefs: csv(formData.get("visualRefs")),
      imagePromptTemplate: String(formData.get("imagePromptTemplate") ?? "") || null,
      slang: csv(formData.get("slang")),
      motifs: csv(formData.get("motifs")),
      forbiddenWords: csv(formData.get("forbiddenWords")),
      influences: csv(formData.get("influences")),
      personaCore: String(formData.get("personaCore") ?? "") || null,
      isPublic: formData.get("isPublic") === "on",
      updatedAt: new Date(),
    })
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));

  revalidatePath(`/personas/${personaId}`);
}
