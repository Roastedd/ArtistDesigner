"use server";

import { and, desc, eq, sql as dsql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  lyricVersions,
  personaSignals,
  personas,
  trackExemplars,
  tracks,
} from "@/db/schema";
import { assertOwnsPersona } from "@/lib/auth-guards";

/**
 * Parse a free-form Suno/Udio "style" string into normalized signal tags.
 * Suno emits comma-separated lists like:
 *   "dark synthwave, female alto, 110 bpm, anthemic chorus, moody"
 * We split, lowercase, dedupe, and bucket each token by simple heuristics
 * so the persona Signature card can group them.
 */
function classifySignals(style: string): { type: string; value: string }[] {
  const parts = style
    .split(/[,;|\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length < 60);
  const seen = new Set<string>();
  const out: { type: string; value: string }[] = [];
  for (const raw of parts) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    let type = "tag";
    if (/\b(\d{2,3})\s*bpm\b/.test(raw)) type = "tempo";
    else if (/\b(male|female|alto|tenor|soprano|bass|baritone|vocal|vocals|rapper|rap)\b/.test(raw))
      type = "vocal";
    else if (
      /\b(guitar|piano|synth|drums|808|bass|strings|sax|brass|pads|organ|ukulele|banjo|fiddle)\b/.test(raw)
    )
      type = "instrument";
    else if (
      /\b(moody|anthemic|melancholic|aggressive|dreamy|chill|energetic|dark|bright|sad|hopeful|romantic|angry|nostalgic|euphoric|introspective)\b/.test(
        raw,
      )
    )
      type = "mood";
    else if (
      /\b(pop|rock|hip[- ]?hop|rap|country|folk|indie|edm|house|techno|trap|r&b|rnb|soul|jazz|blues|metal|punk|reggae|latin|kpop|synthwave|lofi|ambient|gospel|disco|funk|electronic|alternative)\b/.test(
        raw,
      )
    )
      type = "genre";
    out.push({ type, value: raw });
  }
  return out;
}

/** Pull a Suno song id out of a public share URL, if present. */
function extractExternalId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:song|s|share)\/([A-Za-z0-9-]{8,})/);
  return m ? m[1] : null;
}

const importSchema = z.object({
  personaId: z.string().uuid(),
  source: z.enum(["suno", "udio", "manual"]),
  title: z.string().min(1).max(200),
  externalUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  stylePrompt: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
  lyrics: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .transform((v) => (v ? v : null)),
  audioUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  pinAsExemplar: z.boolean().default(false),
});

export type ImportClipInput = z.input<typeof importSchema>;

/**
 * Capture a clip from Suno/Udio (or manual) into the persona's archive.
 * Creates a Track + optional LyricVersion, upserts persona_signals from
 * the style string, and (optionally) pins it as an exemplar.
 */
export async function importExternalClip(input: ImportClipInput) {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    await assertOwnsPersona(data.personaId);
  } catch {
    return { ok: false as const, error: "Persona not found" };
  }

  const externalId = extractExternalId(data.externalUrl);

  const [track] = await db
    .insert(tracks)
    .values({
      personaId: data.personaId,
      title: data.title,
      status: "demo",
      externalSource: data.source,
      externalUrl: data.externalUrl,
      externalId,
      stylePrompt: data.stylePrompt,
      audioUrl: data.audioUrl,
      importedAt: new Date(),
    })
    .returning({ id: tracks.id });

  if (data.lyrics) {
    await db.insert(lyricVersions).values({
      trackId: track.id,
      body: data.lyrics,
      source: data.source,
      sourceUrl: data.externalUrl,
    });
  }

  // Upsert signals (weight++) so frequency reflects what's actually working.
  if (data.stylePrompt) {
    const signals = classifySignals(data.stylePrompt);
    const now = new Date();
    for (const s of signals) {
      await db
        .insert(personaSignals)
        .values({
          personaId: data.personaId,
          signalType: s.type,
          value: s.value,
          weight: 1,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: [personaSignals.personaId, personaSignals.signalType, personaSignals.value],
          set: {
            weight: dsql`${personaSignals.weight} + 1`,
            lastSeenAt: now,
          },
        });
    }
  }

  if (data.pinAsExemplar) {
    await db
      .insert(trackExemplars)
      .values({
        trackId: track.id,
        personaId: data.personaId,
        stylePrompt: data.stylePrompt,
      })
      .onConflictDoNothing();
  }

  // Touch persona updatedAt so dashboards re-sort.
  await db
    .update(personas)
    .set({ updatedAt: new Date() })
    .where(eq(personas.id, data.personaId));

  revalidatePath("/dashboard");
  revalidatePath("/library/tracks");
  revalidatePath(`/personas/${data.personaId}`);
  revalidatePath("/guides/first-song");

  return { ok: true as const, trackId: track.id };
}

/** Toggle whether a track is pinned as a canonical exemplar. */
export async function setExemplar(trackId: string, pin: boolean) {
  const [t] = await db
    .select({ personaId: tracks.personaId, stylePrompt: tracks.stylePrompt })
    .from(tracks)
    .where(eq(tracks.id, trackId));
  if (!t) return { ok: false as const, error: "Track not found" };
  try {
    await assertOwnsPersona(t.personaId);
  } catch {
    return { ok: false as const, error: "Forbidden" };
  }

  if (pin) {
    await db
      .insert(trackExemplars)
      .values({
        trackId,
        personaId: t.personaId,
        stylePrompt: t.stylePrompt,
      })
      .onConflictDoNothing();
  } else {
    await db.delete(trackExemplars).where(eq(trackExemplars.trackId, trackId));
  }
  revalidatePath(`/personas/${t.personaId}`);
  return { ok: true as const };
}

/**
 * Read the top-N signals per type for a persona — drives the Signature card.
 * Returns groups in display order.
 */
export async function getPersonaSignature(personaId: string, perType = 8) {
  await assertOwnsPersona(personaId);
  const rows = await db
    .select()
    .from(personaSignals)
    .where(eq(personaSignals.personaId, personaId))
    .orderBy(desc(personaSignals.weight), desc(personaSignals.lastSeenAt));

  const groups: Record<string, { value: string; weight: number }[]> = {};
  for (const r of rows) {
    const list = (groups[r.signalType] ??= []);
    if (list.length < perType) list.push({ value: r.value, weight: r.weight });
  }

  const exemplars = await db
    .select({
      trackId: trackExemplars.trackId,
      stylePrompt: trackExemplars.stylePrompt,
      pinnedAt: trackExemplars.pinnedAt,
      title: tracks.title,
      externalUrl: tracks.externalUrl,
      externalSource: tracks.externalSource,
    })
    .from(trackExemplars)
    .innerJoin(tracks, eq(tracks.id, trackExemplars.trackId))
    .where(and(eq(trackExemplars.personaId, personaId)))
    .orderBy(desc(trackExemplars.pinnedAt));

  return { groups, exemplars };
}
