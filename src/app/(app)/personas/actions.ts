"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
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
import { slugify } from "@/lib/utils";
import { generate } from "@/lib/openrouter";
import { buildCorePromptTemplate } from "@/lib/persona-prompt";
import { checkRateLimit } from "@/lib/rate-limit";

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

export async function deletePersona(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));

  revalidatePath("/dashboard");
  revalidatePath("/personas");
  redirect("/dashboard");
}

export async function regeneratePersonaCore(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const rl = checkRateLimit(`ai:${session.user.id}`, 20, 60_000);
  if (!rl.ok) throw new Error("Rate limit reached. Try again in a minute.");

  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) throw new Error("Not found");

  const text = await generate({
    messages: [
      { role: "system", content: "You are a precise creative collaborator." },
      { role: "user", content: buildCorePromptTemplate(p) },
    ],
    temperature: 0.6,
    max_tokens: 600,
  });

  await db
    .update(personas)
    .set({ personaCore: text, updatedAt: new Date() })
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));

  revalidatePath(`/personas/${personaId}`);
}

export async function clonePersona(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [src] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!src) throw new Error("Not found");

  const { id: _omit, createdAt: _c, updatedAt: _u, slug: _s, name, ...rest } = src;
  void _omit; void _c; void _u; void _s;
  const newName = `${name} (copy)`;
  const [created] = await db
    .insert(personas)
    .values({
      ...rest,
      name: newName,
      slug: slugify(newName) + "-" + Math.random().toString(36).slice(2, 6),
      isPublic: false,
    })
    .returning({ id: personas.id });

  // Clone eras (build id map)
  const srcEras = await db.select().from(eras).where(eq(eras.personaId, personaId));
  const eraMap = new Map<string, string>();
  for (const e of srcEras) {
    const [ne] = await db
      .insert(eras)
      .values({
        personaId: created.id,
        name: e.name,
        description: e.description,
        orderIndex: e.orderIndex,
        dnaOverrides: e.dnaOverrides,
      })
      .returning({ id: eras.id });
    eraMap.set(e.id, ne.id);
  }

  // Clone albums
  const srcAlbums = await db.select().from(albums).where(eq(albums.personaId, personaId));
  const albumMap = new Map<string, string>();
  for (const a of srcAlbums) {
    const [na] = await db
      .insert(albums)
      .values({
        personaId: created.id,
        eraId: a.eraId ? eraMap.get(a.eraId) ?? null : null,
        title: a.title,
        concept: a.concept,
        coverUrl: a.coverUrl,
        releaseDate: a.releaseDate,
      })
      .returning({ id: albums.id });
    albumMap.set(a.id, na.id);
  }

  // Clone tracks
  const srcTracks = await db.select().from(tracks).where(eq(tracks.personaId, personaId));
  const trackMap = new Map<string, string>();
  for (const t of srcTracks) {
    const [nt] = await db
      .insert(tracks)
      .values({
        personaId: created.id,
        albumId: t.albumId ? albumMap.get(t.albumId) ?? null : null,
        title: t.title,
        status: t.status,
        orderIndex: t.orderIndex,
        notes: t.notes,
        audioUrl: t.audioUrl,
        bpm: t.bpm,
        keySignature: t.keySignature,
        durationSec: t.durationSec,
      })
      .returning({ id: tracks.id });
    trackMap.set(t.id, nt.id);
  }

  // Clone prompt + lyric versions (per track)
  for (const [oldId, newId] of trackMap) {
    const pvs = await db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.trackId, oldId));
    for (const pv of pvs) {
      await db.insert(promptVersions).values({
        trackId: newId,
        target: pv.target,
        body: pv.body,
        model: pv.model,
      });
    }
    const lvs = await db
      .select()
      .from(lyricVersions)
      .where(eq(lyricVersions.trackId, oldId));
    for (const lv of lvs) {
      await db.insert(lyricVersions).values({
        trackId: newId,
        body: lv.body,
        structure: lv.structure,
        model: lv.model,
      });
    }
  }

  // Clone releases
  const srcReleases = await db
    .select()
    .from(releases)
    .where(eq(releases.personaId, personaId));
  for (const r of srcReleases) {
    await db.insert(releases).values({
      personaId: created.id,
      albumId: r.albumId ? albumMap.get(r.albumId) ?? null : null,
      distributor: r.distributor,
      upc: r.upc,
      releaseDate: r.releaseDate,
      checklist: r.checklist,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/personas/${created.id}`);
}
