import { z } from "zod";

/**
 * Shared Zod schemas for server actions and API routes.
 *
 * Goals:
 * - Centralize size/range limits so they don't drift across actions.
 * - Replace ad-hoc `String()` / `Number()` coercions with parsed primitives.
 * - Coerce empty strings to `null` for optional text fields (matches DB shape).
 */

const TEXT_SHORT = 200;
const TEXT_MED = 2_000;
const TEXT_LONG = 10_000;

/** Trim, coerce empty -> null, enforce max length. */
const optionalText = (max = TEXT_MED) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .nullable();

/** Required non-empty trimmed string. */
const requiredText = (max = TEXT_SHORT) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "Required").max(max));

/** Comma-separated string -> string[]. Caps at 50 items. */
const csvList = (maxItems = 50, maxLen = 80) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v): string[] =>
      Array.isArray(v)
        ? v
        : v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    )
    .pipe(z.array(z.string().max(maxLen)).max(maxItems));

/** BPM is a sane musical value or null. */
const bpm = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  })
  .pipe(z.number().int().min(20).max(300).nullable());

/** Allow only http(s) URLs; reject data:, file:, javascript:, etc. */
const externalUrl = (max = 2_048) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => {
        if (v === null) return true;
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid http(s) URL" },
    );

const optionalDate = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  })
  .pipe(z.date().nullable());

/* ──────────────────────────────────────────────
   Personas
   ────────────────────────────────────────────── */

export const personaCreateSchema = z.object({
  name: requiredText(120),
  tagline: optionalText(TEXT_SHORT),
  bio: optionalText(TEXT_LONG),
  genres: csvList(),
  bpmMin: bpm,
  bpmMax: bpm,
  vocalStyle: optionalText(TEXT_SHORT),
  instrumentation: csvList(),
  mixAesthetic: optionalText(TEXT_MED),
  colorPalette: csvList(20, 32),
  influences: csvList(),
  motifs: csvList(),
  personality: csvList(),
  keyTendencies: optionalText(TEXT_MED),
  lyricalTone: optionalText(TEXT_MED),
  visualAesthetic: optionalText(TEXT_MED),
  themes: optionalText(TEXT_MED),
  targetAudience: optionalText(TEXT_MED),
});

export const personaUpdateSchema = personaCreateSchema.extend({
  visualRefs: csvList(),
  imagePromptTemplate: optionalText(TEXT_MED),
  slang: csvList(),
  forbiddenWords: csvList(),
  personaCore: optionalText(TEXT_LONG),
  isPublic: z.union([z.literal("on"), z.boolean(), z.string(), z.undefined()])
    .transform((v) => v === true || v === "on" || v === "true"),
});

/* ──────────────────────────────────────────────
   Albums
   ────────────────────────────────────────────── */

export const albumCreateSchema = z.object({
  title: requiredText(200),
  concept: optionalText(TEXT_LONG),
  eraId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const albumUpdateSchema = albumCreateSchema.extend({
  coverUrl: externalUrl(),
  releaseDate: optionalDate,
});

/* ──────────────────────────────────────────────
   Tracks
   ────────────────────────────────────────────── */

export const trackStatusEnum = z.enum([
  "idea",
  "prompt",
  "lyrics",
  "demo",
  "master",
  "released",
]);

export const trackUpdateSchema = z.object({
  title: requiredText(200),
  status: trackStatusEnum,
  notes: optionalText(TEXT_LONG),
  audioUrl: externalUrl(),
  bpm: bpm,
  keySignature: optionalText(20),
});

/* ──────────────────────────────────────────────
   API: AI generation
   ────────────────────────────────────────────── */

export const aiGenerateSchema = z.object({
  personaId: z.string().uuid(),
  mode: z.enum(["suno", "lyrics", "core"]),
  brief: z.string().max(TEXT_LONG).optional(),
  model: z.string().max(120).optional(),
  target: z.enum(["suno", "udio", "riffusion"]).optional(),
  saveTo: z.object({ trackId: z.string().uuid() }).optional(),
  controls: z.record(z.string(), z.unknown()).optional(),
});

/* ──────────────────────────────────────────────
   FormData helper
   ────────────────────────────────────────────── */

/** Convert FormData into a plain object Zod can parse. */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    // Multi-value fields collapse into arrays
    if (k in out) {
      const existing = out[k];
      out[k] = Array.isArray(existing) ? [...existing, v] : [existing, v];
    } else {
      out[k] = v;
    }
  }
  return out;
}
