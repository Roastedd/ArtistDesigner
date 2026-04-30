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

/**
 * Deterministic, ready-to-paste Suno/Udio prompt built from the persona DNA.
 * No LLM call \u2014 used for the always-visible "AI Music Generator Prompt"
 * card on the artist profile.
 */
export function staticSunoPrompt(p: Persona): string {
  const parts: string[] = [];
  if (p.genres?.length) parts.push(p.genres.slice(0, 3).join(", "));
  if (p.lyricalTone) parts.push(p.lyricalTone);
  if (p.vocalStyle) parts.push(p.vocalStyle);
  if (p.instrumentation?.length)
    parts.push(p.instrumentation.slice(0, 5).join(", "));
  if (p.bpmMin && p.bpmMax)
    parts.push(`tempo ${Math.round((p.bpmMin + p.bpmMax) / 2)}bpm`);
  else if (p.bpmMin) parts.push(`tempo ${p.bpmMin}bpm`);
  if (p.keyTendencies) parts.push(p.keyTendencies);
  if (p.mixAesthetic) parts.push(p.mixAesthetic);
  if (p.motifs?.length)
    parts.push(`themes: ${p.motifs.slice(0, 4).join(", ")}`);
  return parts.filter(Boolean).join(", ") + ".";
}

export function sunoPromptTemplate(core: string, brief: string) {  return [
    "You are a senior music director writing a Suno style prompt.",
    "",
    "OUTPUT FORMAT (no preamble, no markdown, no quotes):",
    "Line 1: [Genre] [Mood/Vibe], [BPM] BPM, [Key]",
    "Line 2: [Instrument emphasis], [Vocal style]",
    "Line 3: 1\u20132 short evocative descriptors (texture, era, mix character)",
    "",
    "RULES:",
    "- Total output \u2264 60 words. Comma-separated where possible.",
    "- No full sentences. No 'a', 'the', 'with'. Tag-style.",
    "- Pull genre / BPM range / vocal / instrumentation directly from the Artist DNA.",
    "- If a key is not specified, choose one that matches the mood (minor for melancholy, major for uplift).",
    "",
    "=== ARTIST DNA (LOCKED) ===",
    core,
    "=== BRIEF ===",
    brief,
  ].join("\n");
}

/* ────────────────────────────────────────────────────────────────
   RADIO-READY LYRIC ENGINE
   The actual rules behind the marketing claims on /guides/how-ai-works.
   ──────────────────────────────────────────────────────────────── */

export type LyricControls = {
  /** Section label (Verse 1, Chorus, Bridge, Pre-Chorus, Hook, Outro, Intro). */
  section?: string;
  /** Point of view: 1st person, 2nd person, etc. */
  pov?: "first" | "second" | "third";
  /** Approx syllables per line. Suno/Udio sing 6\u201310 cleanly. */
  syllablesPerLine?: number;
  /** Approx number of lines for this section. */
  lineCount?: number;
  /** A single repeating hook phrase the chorus must land on. */
  hookLine?: string;
  /** Allow profanity / explicit language. */
  explicit?: boolean;
  /** Existing other sections, for continuity. */
  context?: string;
  /** Existing draft for THIS section to refine instead of replace. */
  draft?: string;
};

const SECTION_RULES: Record<string, string> = {
  intro:
    "Atmosphere only. 1\u20134 short lines OR a single ad-lib (yeah, mmm, oh). No chorus reveal.",
  verse:
    "Conversational and concrete. Tell the scene through one specific image or moment, not a summary. Lines can vary in length. Avoid restating the chorus.",
  "pre-chorus":
    "Build tension. Rising syllable count, rising stakes. End on an unresolved feeling that hands off to the chorus.",
  chorus:
    "Singable, repeatable, sticky. The HOOK lives here. Use parallel phrasing across lines. Lines 6\u20139 syllables. Repeat the hook line at least twice. This is the line a fan tattoos.",
  hook: "Same rules as chorus. The single phrase fans will scream back.",
  bridge:
    "Pivot. New angle on the same theme \u2014 a confession, a turn, a question. Different rhythm than the verses. Sets up the final chorus.",
  outro:
    "Echo, fade, or one final ad-lib. Can be a fragmented restatement of the hook. Do not introduce new ideas.",
};

function sectionRule(label: string): string {
  const k = label.toLowerCase().replace(/\s+\d+$/, "").trim();
  if (SECTION_RULES[k]) return SECTION_RULES[k];
  if (k.includes("chorus")) return SECTION_RULES.chorus;
  if (k.includes("verse")) return SECTION_RULES.verse;
  if (k.includes("pre")) return SECTION_RULES["pre-chorus"];
  if (k.includes("hook")) return SECTION_RULES.hook;
  if (k.includes("bridge")) return SECTION_RULES.bridge;
  if (k.includes("outro")) return SECTION_RULES.outro;
  if (k.includes("intro")) return SECTION_RULES.intro;
  return "Match the song\u2019s established voice and energy.";
}

/**
 * Builds the radio-ready lyric prompt. This is the actual engine \u2014 not a generic
 * \"write singable lyrics\" wrapper. It enforces the principles documented on
 * /guides/how-ai-works: human-sounding fragments, slang, slant rhymes,
 * sing-not-read syllable shaping, and explicit anti-AI patterns.
 */
export function lyricsPromptTemplate(
  core: string,
  brief: string,
  controls: LyricControls = {},
) {
  const section = controls.section ?? "";
  const pov =
    controls.pov === "second"
      ? "second person (you / your)"
      : controls.pov === "third"
        ? "third person (he / she / they)"
        : "first person (I / me / my)";
  const syl = controls.syllablesPerLine ?? 7;
  const lines = controls.lineCount ?? (section.toLowerCase().includes("chorus") ? 4 : 6);

  const blocks: string[] = [
    "You are the ghostwriter for the artist below. You write radio-ready lyrics that sound HUMAN, not AI.",
    "",
    "=== HARD RULES (do not violate) ===",
    "1. NO chronological narration (\u201CFirst I woke up, then I went to\u2026\u201D). Drop us mid-scene.",
    "2. NO emotional summaries (\u201CI feel sad and broken\u201D). Show with one concrete image instead.",
    "3. NO formal prose, academic words, or therapist-speak.",
    "4. NO perfectly rhyming AABB couplets all the way through. Use slant rhymes (gone / wrong, mine / time) and the occasional unrhymed line.",
    "5. NO generic platitudes (\u201Cnever give up\u201D, \u201Cyou are enough\u201D, \u201Clive your truth\u201D).",
    "6. Use sung contractions and fragments: ain\u2019t, gonna, \u2019cause, wanna, lemme, doin\u2019, c\u2019mon. Sentence fragments are GOOD.",
    "7. Drop articles when natural (\u201Cempty glass on counter\u201D not \u201Can empty glass on the counter\u201D).",
    "8. Prefer concrete nouns (jacket, neon, 3am, asphalt) over abstractions (sorrow, journey, soul).",
    "9. Every line must be SINGABLE. Stressed syllables land on downbeats. Aim for ~\u00B11 syllables of the target.",
    "10. Ad-libs are allowed in parentheses: (oh), (mmm), (yeah), (uh).",
    "",
    `=== THIS SECTION: ${section || "(unspecified)"} ===`,
    sectionRule(section || ""),
    `Target: about ${lines} lines, ~${syl} syllables per line.`,
    `Point of view: ${pov}.`,
    controls.hookLine
      ? `HOOK LINE (must appear verbatim in any chorus, ideally at line 1 and line 3): \"${controls.hookLine}\"`
      : "",
    controls.explicit
      ? "Explicit language is allowed if it serves the line. Don\u2019t force it."
      : "Keep it clean \u2014 no profanity.",
    "",
    "=== ARTIST DNA (LOCKED) ===",
    core,
    "=== BRIEF ===",
    brief,
  ];

  if (controls.context?.trim()) {
    blocks.push("", "=== OTHER SECTIONS (for continuity, do not repeat) ===", controls.context.trim());
  }
  if (controls.draft?.trim()) {
    blocks.push("", "=== EXISTING DRAFT (refine, don\u2019t replace wholesale) ===", controls.draft.trim());
  }

  blocks.push(
    "",
    `OUTPUT: ONLY the lyric lines for the ${section || "section"}. No section header. No commentary. No markdown. No quotation marks around the whole thing.`,
  );

  return blocks.filter(Boolean).join("\n");
}

/* ────────────────────────────────────────────────────────────────
   ANTI-AI LINT \u2014 heuristic checks on a lyric body.
   Returns warnings the UI can show next to the editor.
   ──────────────────────────────────────────────────────────────── */

const CLICHE_PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\bjourney\b/i, why: "\u201Cjourney\u201D is a top-5 AI tell." },
  { re: /\bsoul\s+(on\s+fire|of\s+mine)\b/i, why: "Generic \u201Csoul\u201D phrasing." },
  { re: /\bnever\s+give\s+up\b/i, why: "Inspirational platitude." },
  { re: /\byou\s+are\s+enough\b/i, why: "Therapy-speak platitude." },
  { re: /\bbroken\s+heart\b/i, why: "Tell-don\u2019t-show clich\u00E9." },
  { re: /\b(in\s+the\s+darkness|through\s+the\s+night)\b/i, why: "Generic AI imagery." },
  { re: /\bdance\s+(in|under)\s+the\s+(rain|moonlight)\b/i, why: "Greeting-card imagery." },
  { re: /\bfeel(s|ing)?\s+(so\s+)?(sad|happy|alive|lost|broken)\b/i, why: "Emotional summary \u2014 show, don\u2019t tell." },
  { re: /\b(first|then|next|after\s+that|finally)\s+I\b/i, why: "Chronological narration." },
  { re: /\bevery\s+(step|breath|moment)\b/i, why: "Generic abstraction." },
];

export type LyricLint = {
  line: number;
  text: string;
  why: string;
};

export function lintLyrics(body: string): LyricLint[] {
  const out: LyricLint[] = [];
  const lines = body.split(/\n/);
  lines.forEach((raw, i) => {
    const text = raw.trim();
    if (!text || text.startsWith("[")) return;
    for (const { re, why } of CLICHE_PATTERNS) {
      if (re.test(text)) {
        out.push({ line: i + 1, text, why });
        break;
      }
    }
  });
  // AABB perfect-rhyme density check (very rough): if 4+ consecutive lines
  // rhyme on the last word in pairs, flag it.
  const lastWord = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s']/g, "").trim().split(/\s+/).pop() ?? "";
  const tail = (w: string) => w.slice(-2);
  const lyricLines = lines.filter((l) => l.trim() && !l.trim().startsWith("["));
  let pairStreak = 0;
  for (let i = 0; i + 1 < lyricLines.length; i += 2) {
    if (
      tail(lastWord(lyricLines[i])) &&
      tail(lastWord(lyricLines[i])) === tail(lastWord(lyricLines[i + 1]))
    ) {
      pairStreak += 1;
    } else {
      pairStreak = 0;
    }
    if (pairStreak >= 3) {
      out.push({
        line: 0,
        text: "",
        why: "6+ consecutive lines all rhyme in perfect couplets \u2014 break the pattern with a slant rhyme or unrhymed line.",
      });
      break;
    }
  }
  return out;
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
