import type { InferSelectModel } from "drizzle-orm";
import type { personas } from "@/db/schema";

type Persona = InferSelectModel<typeof personas>;

/**
 * Builds the locked "Persona Core" block injected into every
 * prompt/lyric request to keep voice consistent.
 */
export function buildPersonaCore(p: Persona): string {
  if (p.personaCore && p.personaCore.trim().length > 0) return p.personaCore;

  const lines: string[] = [];
  lines.push(`# Artist: ${p.name}`);
  if (p.tagline) lines.push(`Tagline: ${p.tagline}`);
  if (p.bio) lines.push(`Bio: ${p.bio}`);

  if (p.genres?.length) lines.push(`Genres: ${p.genres.join(", ")}`);
  if (p.bpmMin || p.bpmMax)
    lines.push(`BPM: ${p.bpmMin ?? "?"}–${p.bpmMax ?? "?"}`);
  if (p.vocalStyle) lines.push(`Vocals: ${p.vocalStyle}`);
  if (p.instrumentation?.length)
    lines.push(`Instrumentation: ${p.instrumentation.join(", ")}`);
  if (p.mixAesthetic) lines.push(`Mix: ${p.mixAesthetic}`);

  if (p.influences?.length) lines.push(`Influences: ${p.influences.join(", ")}`);
  if (p.motifs?.length) lines.push(`Recurring motifs: ${p.motifs.join(", ")}`);
  if (p.slang?.length) lines.push(`Slang/lexicon: ${p.slang.join(", ")}`);
  if (p.forbiddenWords?.length)
    lines.push(`NEVER use: ${p.forbiddenWords.join(", ")}`);

  return lines.join("\n");
}

export function sunoPromptTemplate(core: string, brief: string) {
  return [
    "You are a senior music director writing a Suno prompt.",
    "Output a single, dense Suno-style style prompt (no preamble, no markdown).",
    "It must reflect the locked Artist DNA below verbatim in spirit.",
    "",
    "=== ARTIST DNA (LOCKED) ===",
    core,
    "=== BRIEF ===",
    brief,
  ].join("\n");
}

export function lyricsPromptTemplate(core: string, brief: string) {
  return [
    "You are the ghostwriter for the artist below. Write singable, human-sounding lyrics.",
    "Use the slang and motifs naturally. Avoid forbidden words. Use clear song sections:",
    "[Intro] [Verse 1] [Pre-Chorus] [Chorus] [Verse 2] [Bridge] [Outro] as appropriate.",
    "",
    "=== ARTIST DNA (LOCKED) ===",
    core,
    "=== BRIEF ===",
    brief,
  ].join("\n");
}
