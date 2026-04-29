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

export function promptTemplateFor(
  target: "suno" | "udio" | "riffusion",
  core: string,
  brief: string,
) {
  if (target === "suno") return sunoPromptTemplate(core, brief);
  const targetNotes: Record<"udio" | "riffusion", string> = {
    udio:
      "Write a Udio-style prompt: comma-separated tags + a short evocative phrase. Mention vocal timbre, era cues, mix character.",
    riffusion:
      "Write a Riffusion-style prompt: short, vivid, sound-design forward. Lean on textures, loops, BPM, and key.",
  };
  return [
    `You are a senior music director writing a ${target} prompt.`,
    targetNotes[target],
    "Output a single, dense prompt (no preamble, no markdown).",
    "It must reflect the locked Artist DNA below verbatim in spirit.",
    "",
    "=== ARTIST DNA (LOCKED) ===",
    core,
    "=== BRIEF ===",
    brief,
  ].join("\n");
}

export function buildCorePromptTemplate(p: {
  name: string;
  tagline?: string | null;
  bio?: string | null;
  genres?: string[] | null;
  influences?: string[] | null;
  vocalStyle?: string | null;
  instrumentation?: string[] | null;
  mixAesthetic?: string | null;
  motifs?: string[] | null;
  slang?: string[] | null;
}) {
  const facts: string[] = [];
  facts.push(`Name: ${p.name}`);
  if (p.tagline) facts.push(`Tagline: ${p.tagline}`);
  if (p.bio) facts.push(`Bio: ${p.bio}`);
  if (p.genres?.length) facts.push(`Genres: ${p.genres.join(", ")}`);
  if (p.influences?.length) facts.push(`Influences: ${p.influences.join(", ")}`);
  if (p.vocalStyle) facts.push(`Vocal style: ${p.vocalStyle}`);
  if (p.instrumentation?.length)
    facts.push(`Instrumentation: ${p.instrumentation.join(", ")}`);
  if (p.mixAesthetic) facts.push(`Mix aesthetic: ${p.mixAesthetic}`);
  if (p.motifs?.length) facts.push(`Motifs: ${p.motifs.join(", ")}`);
  if (p.slang?.length) facts.push(`Slang: ${p.slang.join(", ")}`);

  return [
    "Write a tight, evocative ARTIST DNA card (~150–250 words).",
    "Sections, in order, with these exact headers:",
    "## Identity",
    "## Sonic palette",
    "## Vocal & lyrical voice",
    "## Visual & vibe cues",
    "## Don'ts",
    "Be concrete and specific. No filler. Use the supplied facts; do not invent biography.",
    "",
    "=== FACTS ===",
    facts.join("\n"),
  ].join("\n");
}
