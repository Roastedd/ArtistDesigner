/**
 * Curated brief templates for the Prompt Forge.
 *
 * These are starting points users one-click into the brief textarea — they
 * still get re-written by the LLM through the persona DNA, so output stays
 * on-brand. The goal is to give producers a vocabulary jumpstart instead of
 * staring at an empty box.
 */

export type PromptTemplateMode = "suno" | "lyrics";

export type PromptTemplate = {
  id: string;
  mode: PromptTemplateMode;
  category: string;
  label: string;
  description: string;
  brief: string;
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  /* ── SUNO / UDIO BRIEFS ─────────────────────────────────────── */
  {
    id: "suno-moody-opener",
    mode: "suno",
    category: "Album openers",
    label: "Moody opener",
    description: "Slow burn intro with tension and a glitchy chorus drop.",
    brief:
      "Album opener. Slow build, sparse percussion, ambient pads. Tension rises across the second verse and lands on a glitchy, half-time chorus drop. Leaves the listener leaning in.",
  },
  {
    id: "suno-statement-piece",
    mode: "suno",
    category: "Album openers",
    label: "Statement piece",
    description: "Big, declarative track-1 that announces the era.",
    brief:
      "Era-defining opener. Confident tempo, signature instrument front and center, hook within the first 30 seconds. Should feel like the artist planting a flag for this album.",
  },
  {
    id: "suno-radio-single",
    mode: "suno",
    category: "Singles",
    label: "Radio single",
    description: "Tight 3-minute single optimized for streaming + playlists.",
    brief:
      "3-minute lead single. Hook within 20 seconds, two verses, double chorus at the end, cold ending. Optimized for playlist editors — high replay value, instant earworm.",
  },
  {
    id: "suno-tiktok-hook",
    mode: "suno",
    category: "Singles",
    label: "Short-form hook track",
    description: "Built around one 15-second moment for TikTok / Reels.",
    brief:
      "Built around a single 15-second moment that loops perfectly. Memorable vocal phrase plus a distinctive sound design hit. The full track exists, but the hook section is the star.",
  },
  {
    id: "suno-late-night-cut",
    mode: "suno",
    category: "Vibes",
    label: "Late-night cut",
    description: "3am headphones track, intimate and slightly blurred.",
    brief:
      "Late-night, after-hours feel. Intimate vocal up close in the mix, blurry reverbs, swung percussion. Feels like driving home alone at 3am.",
  },
  {
    id: "suno-sunset-drive",
    mode: "suno",
    category: "Vibes",
    label: "Sunset drive",
    description: "Warm, mid-tempo, golden-hour windows-down energy.",
    brief:
      "Mid-tempo, warm and golden. Windows-down, sunset on the highway. Major-key, lush chords, soft saturation, vocal stacks on the chorus.",
  },
  {
    id: "suno-club-pulse",
    mode: "suno",
    category: "Energy",
    label: "Club pulse",
    description: "Four-on-the-floor with a drop the room can hold.",
    brief:
      "Four-on-the-floor club energy. Long build through the second verse, drop with a wide synth lead. Designed for a 1am peak set — the room moves together.",
  },
  {
    id: "suno-ballad",
    mode: "suno",
    category: "Energy",
    label: "Album ballad",
    description: "Quiet centerpiece, vulnerable vocal, no drums until late.",
    brief:
      "Album-closing ballad. No drums until the final chorus. Centered on one vulnerable vocal performance, sparse piano or guitar, strings swell at the bridge.",
  },
  {
    id: "suno-genre-bend",
    mode: "suno",
    category: "Experimental",
    label: "Genre bend",
    description: "Two genres collide in the chorus.",
    brief:
      "Two genres from the artist's DNA collide. Verse leans one direction, chorus pivots hard into the other. The friction is the point.",
  },
  {
    id: "suno-interlude",
    mode: "suno",
    category: "Experimental",
    label: "Interlude / skit",
    description: "60–90 second connective tissue between tracks.",
    brief:
      "Short interlude, 60–90 seconds. No full song structure. A texture, a sample, a brief vocal idea. Connective tissue between two larger tracks on the album.",
  },

  /* ── LYRIC BRIEFS ───────────────────────────────────────────── */
  {
    id: "lyrics-insomnia",
    mode: "lyrics",
    category: "Themes",
    label: "Insomnia / city that won't sleep",
    description: "Restless night, neon, the hook lands on 'awake'.",
    brief:
      "Track about insomnia and a city that never sleeps. Concrete details: streetlights, the hum of a fridge, a phone screen at 3am. Chorus hook should repeat the word 'awake'.",
  },
  {
    id: "lyrics-letter-never-sent",
    mode: "lyrics",
    category: "Themes",
    label: "Letter never sent",
    description: "Address an absent person, second-person, no resolution.",
    brief:
      "Lyrics written as a letter that never gets sent. Second-person POV addressing one specific absent person. Tiny, specific memories. The chorus is the line you'd never actually say out loud.",
  },
  {
    id: "lyrics-glow-up",
    mode: "lyrics",
    category: "Themes",
    label: "Glow-up / proving them wrong",
    description: "Confidence track, name the doubters in concrete imagery.",
    brief:
      "Confidence anthem. Specific receipts — a year ago vs. now, a place, a person who counted the artist out. Chorus should be chant-able, fans scream it back at the show.",
  },
  {
    id: "lyrics-summer-fling",
    mode: "lyrics",
    category: "Themes",
    label: "Summer fling, brief and bright",
    description: "Three weeks, not three years. Light and a little reckless.",
    brief:
      "Short summer thing. Not love, not heartbreak — just three weeks of something bright and a little reckless. Sensory: heat on asphalt, cheap wine, a borrowed car.",
  },
  {
    id: "lyrics-room-after",
    mode: "lyrics",
    category: "Themes",
    label: "The room after they leave",
    description: "Aftermath piece. Show the absence through objects.",
    brief:
      "After someone has left — the room a day later. Show the absence through objects: their mug, the side of the bed, a hair tie on the floor. Never name the emotion.",
  },
  {
    id: "lyrics-anti-anthem",
    mode: "lyrics",
    category: "Themes",
    label: "Anti-anthem",
    description: "Ironic 'celebration' of falling apart.",
    brief:
      "An anti-anthem. The chorus sounds celebratory but the lyrics describe falling apart. The contrast does the work — never wink at the listener.",
  },
  {
    id: "lyrics-hometown",
    mode: "lyrics",
    category: "Themes",
    label: "Hometown, on a return visit",
    description: "Place-specific nostalgia, half familiar, half foreign.",
    brief:
      "Going back to the hometown after years away. Half of it familiar, half of it foreign. Names of streets or shops if it fits the persona. Quiet observation, not a thesis.",
  },
];

export function templatesByCategory(mode: PromptTemplateMode) {
  const filtered = PROMPT_TEMPLATES.filter((t) => t.mode === mode);
  const grouped = new Map<string, PromptTemplate[]>();
  for (const t of filtered) {
    const arr = grouped.get(t.category) ?? [];
    arr.push(t);
    grouped.set(t.category, arr);
  }
  return Array.from(grouped.entries());
}
