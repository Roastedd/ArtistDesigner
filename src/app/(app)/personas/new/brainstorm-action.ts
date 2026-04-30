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

// Increase Vercel function timeout for this action (requires Next.js 14+)
// NOTE: maxDuration must be exported from the page/route segment, not here

const SYSTEM = `You are a music A&R consultant and artist branding specialist.
Given a rough vibe description, generate a compelling artist persona.
IMPORTANT: Respond with a single raw JSON object only.
Do NOT use markdown code fences or backticks. Start your response with { and end with }.
Schema:
{
  "names": ["Name1", "Name2", "Name3"],
  "tagline": "one punchy sentence, max 12 words",
  "bio": "2–3 sentences, third-person",
  "genres": "genre1, genre2, genre3",
  "vocalStyle": "short phrase",
  "instrumentation": "instrument1, instrument2, instrument3",
  "mixAesthetic": "short phrase, e.g. lo-fi bedroom pop with reverb-drenched 808s",
  "influences": "Artist A, Artist B, Artist C",
  "motifs": "motif1, motif2, motif3"
}
Make names evocative, not generic. Bio should feel real, not promotional.`;

/** Extract a JSON object from model output that may include prose or code fences. */
function extractJSON(text: string): string {
  // Strip markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find first { ... } block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

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
      // Use a fast, reliable model for structured output
      model: "google/gemini-flash-1.5",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Vibe: ${vibe}` },
      ],
      temperature: 0.9,
      max_tokens: 700,
    });
  } catch (err) {
    console.error("[brainstorm] generate error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // Surface OpenRouter error codes to the user in a readable way
    if (msg.includes("402")) return { ok: false, error: "AI quota exceeded — try again later" };
    if (msg.includes("429")) return { ok: false, error: "Too many requests — try again in a moment" };
    if (msg.includes("503") || msg.includes("529"))
      return { ok: false, error: "AI model is overloaded — try again in a moment" };
    return { ok: false, error: "AI generation failed — try again" };
  }

  let parsed: BrainstormResult;
  try {
    parsed = JSON.parse(extractJSON(raw)) as BrainstormResult;
    if (!Array.isArray(parsed.names) || parsed.names.length < 3) {
      console.error("[brainstorm] bad response shape:", raw);
      return { ok: false, error: "Unexpected AI response — try again" };
    }
    // Ensure exactly 3 names
    while (parsed.names.length < 3) parsed.names.push("Unnamed" as never);
  } catch (err) {
    console.error("[brainstorm] JSON parse error:", err, "raw:", raw);
    return { ok: false, error: "Couldn't parse AI response — try again" };
  }

  return { ok: true, result: parsed };
}
