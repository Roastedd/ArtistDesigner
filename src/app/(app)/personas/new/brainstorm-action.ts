"use server";

import { auth } from "@/auth";
import { generate } from "@/lib/openrouter";
import { checkRateLimit } from "@/lib/rate-limit";

export type BrainstormResult = {
  names: [string, string, string];
  tagline: string;
  bio: string;
  genres: string;
  vocalStyle: string;
  instrumentation: string;
  mixAesthetic: string;
  influences: string;
  motifs: string;
};

export type BrainstormState =
  | { ok: true; result: BrainstormResult }
  | { ok: false; error: string };

const SYSTEM = `You are a music A&R consultant and artist branding specialist.
Given a rough vibe description, you generate a compelling artist persona.
Respond with a single JSON object — no markdown, no prose outside the JSON.
The schema:
{
  "names": ["Name1", "Name2", "Name3"],   // 3 distinct artist name options
  "tagline": "...",                        // one punchy sentence, ≤ 12 words
  "bio": "...",                            // 2–3 sentences, third-person
  "genres": "genre1, genre2, genre3",      // comma-separated
  "vocalStyle": "...",                     // short phrase
  "instrumentation": "synths, drums, ...", // comma-separated instruments
  "mixAesthetic": "...",                   // short phrase, e.g. "lo-fi bedroom pop with reverb-drenched 808s"
  "influences": "Artist A, Artist B, Artist C", // comma-separated real artists
  "motifs": "isolation, cassette warmth, nostalgia" // comma-separated lyric/thematic motifs
}
Make names evocative, not generic. Bio should feel real, not promotional.`;

export async function brainstormPersona(
  _prev: BrainstormState | null,
  formData: FormData,
): Promise<BrainstormState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in" };

  const rl = checkRateLimit(`brainstorm:${session.user.id}`, 10, 60_000);
  if (!rl.ok) return { ok: false, error: "Too many requests — wait a moment" };

  const vibe = String(formData.get("vibe") ?? "").trim();
  if (!vibe) return { ok: false, error: "Describe a vibe first" };
  if (vibe.length > 600) return { ok: false, error: "Keep it under 600 characters" };

  let raw: string;
  try {
    raw = await generate({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Vibe: ${vibe}` },
      ],
      temperature: 0.9,
      max_tokens: 700,
      response_format: { type: "json_object" },
    });
  } catch {
    return { ok: false, error: "AI generation failed — try again" };
  }

  let parsed: BrainstormResult;
  try {
    parsed = JSON.parse(raw) as BrainstormResult;
    if (!Array.isArray(parsed.names) || parsed.names.length < 3) {
      return { ok: false, error: "Unexpected AI response — try again" };
    }
  } catch {
    return { ok: false, error: "Couldn't parse AI response — try again" };
  }

  return { ok: true, result: parsed };
}
