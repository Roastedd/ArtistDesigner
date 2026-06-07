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
import { buildSlug } from "@/lib/utils";
import { DEFAULT_FALLBACK_CHAIN, generate, generateWithFallback } from "@/lib/openrouter";
import { buildCorePromptTemplate } from "@/lib/persona-prompt";
import { checkRateLimit } from "@/lib/rate-limit";

function csv(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeReturnTo(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  try {
    const url = new URL(raw, "https://artistdesigner.local");
    if (url.origin !== "https://artistdesigner.local") return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function withCreatedPersona(path: string, personaId: string): string {
  const url = new URL(path, "https://artistdesigner.local");
  url.searchParams.set("createdPersonaId", personaId);
  return `${url.pathname}${url.search}`;
}

export async function createPersona(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");

  const bpmMinRaw = formData.get("bpmMin");
  const bpmMaxRaw = formData.get("bpmMax");

  const [p] = await db
    .insert(personas)
    .values({
      userId: session.user.id,
      name,
      slug: buildSlug(name),
      tagline: String(formData.get("tagline") ?? "") || null,
      bio: String(formData.get("bio") ?? "") || null,
      genres: csv(formData.get("genres")),
      bpmMin: bpmMinRaw ? Number(bpmMinRaw) : null,
      bpmMax: bpmMaxRaw ? Number(bpmMaxRaw) : null,
      vocalStyle: String(formData.get("vocalStyle") ?? "") || null,
      instrumentation: csv(formData.get("instrumentation")),
      mixAesthetic: String(formData.get("mixAesthetic") ?? "") || null,
      colorPalette: csv(formData.get("colorPalette")),
      influences: csv(formData.get("influences")),
      motifs: csv(formData.get("motifs")),
      personality: csv(formData.get("personality")),
      keyTendencies: String(formData.get("keyTendencies") ?? "") || null,
      lyricalTone: String(formData.get("lyricalTone") ?? "") || null,
      visualAesthetic: String(formData.get("visualAesthetic") ?? "") || null,
      themes: String(formData.get("themes") ?? "") || null,
      targetAudience: String(formData.get("targetAudience") ?? "") || null,
    })
    .returning({ id: personas.id });

  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (returnTo) redirect(withCreatedPersona(returnTo, p.id));
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
      personality: csv(formData.get("personality")),
      keyTendencies: String(formData.get("keyTendencies") ?? "") || null,
      lyricalTone: String(formData.get("lyricalTone") ?? "") || null,
      visualAesthetic: String(formData.get("visualAesthetic") ?? "") || null,
      themes: String(formData.get("themes") ?? "") || null,
      targetAudience: String(formData.get("targetAudience") ?? "") || null,
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

  // Soft delete: mark as deleted, hide from public + listing.
  await db
    .update(personas)
    .set({ deletedAt: new Date(), isPublic: false, updatedAt: new Date() })
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));

  revalidatePath("/dashboard");
  revalidatePath("/personas");
  revalidatePath("/personas/trash");
  redirect("/personas/trash?just=" + personaId);
}

export async function restorePersona(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await db
    .update(personas)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  revalidatePath("/dashboard");
  revalidatePath("/personas");
  revalidatePath("/personas/trash");
}

export async function hardDeletePersona(personaId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await db
    .delete(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  revalidatePath("/personas/trash");
  redirect("/personas/trash");
}

/**
 * Import a persona from an export JSON. Mirrors the shape produced by
 * GET /api/personas/[id]/export. New IDs are generated for every row;
 * the new persona is private and gets a fresh slug.
 */
type ImportPayload = {
  persona?: Partial<typeof personas.$inferSelect> & { name?: string };
  eras?: Array<typeof eras.$inferSelect>;
  albums?: Array<typeof albums.$inferSelect>;
  tracks?: Array<typeof tracks.$inferSelect>;
  promptVersions?: Array<typeof promptVersions.$inferSelect>;
  lyricVersions?: Array<typeof lyricVersions.$inferSelect>;
  releases?: Array<typeof releases.$inferSelect>;
};

export async function importPersona(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const raw = String(formData.get("payload") ?? "").trim();
  if (!raw) throw new Error("Paste an exported persona JSON.");
  let data: ImportPayload;
  try {
    data = JSON.parse(raw) as ImportPayload;
  } catch {
    throw new Error("Invalid JSON.");
  }
  const src = data.persona;
  if (!src?.name) throw new Error("Payload missing persona.name");

  const newName = src.name;
  const [created] = await db
    .insert(personas)
    .values({
      userId: session.user.id,
      name: newName,
      slug: buildSlug(newName),
      tagline: src.tagline ?? null,
      bio: src.bio ?? null,
      genres: src.genres ?? [],
      bpmMin: src.bpmMin ?? null,
      bpmMax: src.bpmMax ?? null,
      vocalStyle: src.vocalStyle ?? null,
      instrumentation: src.instrumentation ?? [],
      mixAesthetic: src.mixAesthetic ?? null,
      colorPalette: src.colorPalette ?? [],
      visualRefs: src.visualRefs ?? [],
      imagePromptTemplate: src.imagePromptTemplate ?? null,
      slang: src.slang ?? [],
      motifs: src.motifs ?? [],
      forbiddenWords: src.forbiddenWords ?? [],
      influences: src.influences ?? [],
      personaCore: src.personaCore ?? null,
      isPublic: false,
    })
    .returning({ id: personas.id });

  const eraMap = new Map<string, string>();
  for (const e of data.eras ?? []) {
    const [ne] = await db
      .insert(eras)
      .values({
        personaId: created.id,
        name: e.name,
        description: e.description ?? null,
        orderIndex: e.orderIndex ?? 0,
        dnaOverrides: e.dnaOverrides ?? {},
      })
      .returning({ id: eras.id });
    eraMap.set(e.id, ne.id);
  }

  const albumMap = new Map<string, string>();
  for (const a of data.albums ?? []) {
    const [na] = await db
      .insert(albums)
      .values({
        personaId: created.id,
        eraId: a.eraId ? eraMap.get(a.eraId) ?? null : null,
        title: a.title,
        concept: a.concept ?? null,
        coverUrl: a.coverUrl ?? null,
        orderIndex: a.orderIndex ?? 0,
        releaseDate: a.releaseDate ? new Date(a.releaseDate) : null,
      })
      .returning({ id: albums.id });
    albumMap.set(a.id, na.id);
  }

  const trackMap = new Map<string, string>();
  for (const t of data.tracks ?? []) {
    const [nt] = await db
      .insert(tracks)
      .values({
        personaId: created.id,
        albumId: t.albumId ? albumMap.get(t.albumId) ?? null : null,
        title: t.title,
        status: t.status ?? "idea",
        orderIndex: t.orderIndex ?? 0,
        notes: t.notes ?? null,
        audioUrl: t.audioUrl ?? null,
        bpm: t.bpm ?? null,
        keySignature: t.keySignature ?? null,
        durationSec: t.durationSec ?? null,
      })
      .returning({ id: tracks.id });
    trackMap.set(t.id, nt.id);
  }

  for (const pv of data.promptVersions ?? []) {
    const newTrackId = trackMap.get(pv.trackId);
    if (!newTrackId) continue;
    await db.insert(promptVersions).values({
      trackId: newTrackId,
      target: pv.target,
      body: pv.body,
      model: pv.model ?? null,
    });
  }
  for (const lv of data.lyricVersions ?? []) {
    const newTrackId = trackMap.get(lv.trackId);
    if (!newTrackId) continue;
    await db.insert(lyricVersions).values({
      trackId: newTrackId,
      body: lv.body,
      structure: lv.structure ?? [],
      model: lv.model ?? null,
    });
  }
  for (const r of data.releases ?? []) {
    await db.insert(releases).values({
      personaId: created.id,
      albumId: r.albumId ? albumMap.get(r.albumId) ?? null : null,
      distributor: r.distributor ?? null,
      upc: r.upc ?? null,
      releaseDate: r.releaseDate ? new Date(r.releaseDate) : null,
      checklist: r.checklist ?? {},
    });
  }

  revalidatePath("/dashboard");
  redirect(`/personas/${created.id}`);
}

export interface LyricDnaSuggestions {
  genres?: string[];
  bpmMin?: number;
  bpmMax?: number;
  vocalStyle?: string;
  instrumentation?: string[];
  mixAesthetic?: string;
  slang?: string[];
  motifs?: string[];
  influences?: string[];
  tagline?: string;
  bio?: string;
}

export interface PersonaDetailDraft {
  name?: string;
  tagline?: string;
  bio?: string;
  genres?: string;
  bpmMin?: number | string;
  bpmMax?: number | string;
  vocalStyle?: string;
  instrumentation?: string;
  mixAesthetic?: string;
  colorPalette?: string;
  visualRefs?: string;
  imagePromptTemplate?: string;
  slang?: string;
  motifs?: string;
  forbiddenWords?: string;
  influences?: string;
  personality?: string;
  keyTendencies?: string;
  lyricalTone?: string;
  visualAesthetic?: string;
  themes?: string;
  targetAudience?: string;
  personaCore?: string;
}

export type PersonaDetailSuggestions = Required<
  Pick<
    PersonaDetailDraft,
    | "tagline"
    | "bio"
    | "genres"
    | "bpmMin"
    | "bpmMax"
    | "vocalStyle"
    | "instrumentation"
    | "mixAesthetic"
    | "colorPalette"
    | "visualRefs"
    | "imagePromptTemplate"
    | "slang"
    | "motifs"
    | "forbiddenWords"
    | "influences"
    | "personality"
    | "keyTendencies"
    | "lyricalTone"
    | "visualAesthetic"
    | "themes"
    | "targetAudience"
  >
>;

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

function cleanSuggestion(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

export type PersonaDetailAssistantState =
  | { ok: true; suggestions: PersonaDetailSuggestions; model?: string }
  | { ok: false; error: string };

export async function suggestPersonaDetails(
  personaId: string,
  current: PersonaDetailDraft,
  direction: string,
): Promise<PersonaDetailAssistantState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const rl = checkRateLimit(`ai:${session.user.id}`, 20, 60_000);
  if (!rl.ok) return { ok: false, error: "Rate limit reached. Try again in a minute." };

  const [p] = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) return { ok: false, error: "Persona not found" };

  const systemPrompt = `You are an expert A&R director, music producer, lyric coach, and visual identity designer.
Your job is to help a creator fill out a fictional AI music artist profile so future Suno/Udio prompts stay consistent.
Return ONLY valid JSON. No markdown, no prose.
Every string should be concrete, specific, and immediately usable in a form.
Do not use real living artists as a direct clone target; references may be broad influence comparisons only.
Avoid generic filler like "unique sound", "authentic voice", "genre-bending", "emotional journey".

JSON shape:
{
  "tagline": "max 12 words",
  "bio": "2-3 sentences, third-person, evocative and specific",
  "genres": "3-5 comma-separated genre/style tags",
  "bpmMin": 80,
  "bpmMax": 130,
  "vocalStyle": "gender/texture/range/delivery phrase",
  "instrumentation": "5-8 comma-separated instruments/sounds",
  "mixAesthetic": "specific production/mix description",
  "colorPalette": "3-5 comma-separated hex colors",
  "visualRefs": "3-5 comma-separated visual references, not URLs",
  "imagePromptTemplate": "one reusable image-generation prompt for covers/profile art",
  "slang": "5-8 comma-separated lexicon words/phrases the artist would use",
  "motifs": "6-10 comma-separated recurring lyric images/themes",
  "forbiddenWords": "5-8 comma-separated words/cliches to avoid",
  "influences": "3-5 comma-separated broad musical/visual influence references",
  "personality": "3-5 comma-separated personality traits",
  "keyTendencies": "keys/modes that fit the artist",
  "lyricalTone": "one precise phrase",
  "visualAesthetic": "1-2 sentences describing the visual world",
  "themes": "one sentence naming recurring narrative themes",
  "targetAudience": "specific listener/community segment"
}`;

  const userPrompt = `Artist ID: ${p.id}
Stored artist name: ${p.name}

Current unsaved form values:
${JSON.stringify(current, null, 2).slice(0, 6000)}

Creator direction:
${direction.trim() || "Fill gaps and make the artist more coherent, distinctive, and useful for AI music generation."}

Generate a complete improved profile. Preserve strong existing choices, fill missing fields, and make all fields agree with each other.`;

  try {
    const result = await generateWithFallback({
      models: DEFAULT_FALLBACK_CHAIN,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(extractJsonObject(result.content)) as Record<string, unknown>;
    const suggestions: PersonaDetailSuggestions = {
      tagline: cleanSuggestion(parsed.tagline),
      bio: cleanSuggestion(parsed.bio),
      genres: cleanSuggestion(parsed.genres),
      bpmMin: cleanSuggestion(parsed.bpmMin),
      bpmMax: cleanSuggestion(parsed.bpmMax),
      vocalStyle: cleanSuggestion(parsed.vocalStyle),
      instrumentation: cleanSuggestion(parsed.instrumentation),
      mixAesthetic: cleanSuggestion(parsed.mixAesthetic),
      colorPalette: cleanSuggestion(parsed.colorPalette),
      visualRefs: cleanSuggestion(parsed.visualRefs),
      imagePromptTemplate: cleanSuggestion(parsed.imagePromptTemplate),
      slang: cleanSuggestion(parsed.slang),
      motifs: cleanSuggestion(parsed.motifs),
      forbiddenWords: cleanSuggestion(parsed.forbiddenWords),
      influences: cleanSuggestion(parsed.influences),
      personality: cleanSuggestion(parsed.personality),
      keyTendencies: cleanSuggestion(parsed.keyTendencies),
      lyricalTone: cleanSuggestion(parsed.lyricalTone),
      visualAesthetic: cleanSuggestion(parsed.visualAesthetic),
      themes: cleanSuggestion(parsed.themes),
      targetAudience: cleanSuggestion(parsed.targetAudience),
    };
    return { ok: true, suggestions, model: result.model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI detail suggestions failed" };
  }
}

/**
 * Analyze pasted song lyrics and suggest persona DNA updates.
 * Returns structured suggestions the client can review before applying.
 */
export async function analyzeLyricsForPersona(
  personaId: string,
  lyrics: string,
): Promise<{ suggestions: LyricDnaSuggestions; error?: never } | { error: string; suggestions?: never }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!lyrics.trim()) return { error: "No lyrics provided" };

  const rl = checkRateLimit(`ai:${session.user.id}`, 20, 60_000);
  if (!rl.ok) return { error: "Rate limit reached. Try again in a minute." };

  const [p] = await db
    .select({ name: personas.name, genres: personas.genres, vocalStyle: personas.vocalStyle })
    .from(personas)
    .where(and(eq(personas.id, personaId), eq(personas.userId, session.user.id)));
  if (!p) return { error: "Persona not found" };

  const systemPrompt = `You are a music producer and A&R analyst. Analyze song lyrics and extract artist DNA.
Return ONLY valid JSON with this exact shape (omit any field you cannot confidently infer):
{
  "genres": ["string"],
  "bpmMin": number,
  "bpmMax": number,
  "vocalStyle": "string",
  "instrumentation": ["string"],
  "mixAesthetic": "string",
  "slang": ["unique words or phrases from the lyrics that define this artist's vocabulary"],
  "motifs": ["recurring themes or imagery"],
  "influences": ["artists this writing style resembles"],
  "tagline": "one-line artist description",
  "bio": "two-sentence artist bio inferred from the lyric content and emotional tone"
}
Output nothing but the JSON object.`;

  const userPrompt = `Artist: ${p.name}
${p.genres?.length ? `Known genres: ${p.genres.join(", ")}` : ""}

Lyrics to analyze:
${lyrics.slice(0, 4000)}`;

  try {
    const raw = await generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "AI returned unexpected format" };
    const suggestions = JSON.parse(jsonMatch[0]) as LyricDnaSuggestions;
    return { suggestions };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI analysis failed" };
  }
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
      slug: buildSlug(newName),
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
