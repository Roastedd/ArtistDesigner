/**
 * Thin OpenRouter client. Use any model slug from
 * https://openrouter.ai/models — including free tiers
 * (e.g. "openai/gpt-oss-20b:free", "minimax/minimax-m2.5:free").
 */
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | {
            type: "input_audio";
            input_audio: {
              data: string;
              format: "wav" | "mp3" | "ogg" | "flac" | "m4a" | "aac";
            };
          }
      >;
};

export type GenerateOptions = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
};

export async function generate({
  model,
  messages,
  temperature = 0.8,
  max_tokens = 1500,
  response_format,
}: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "ArtistDesigner",
    },
    body: JSON.stringify({
      model: model ?? process.env.OPENROUTER_DEFAULT_MODEL ?? "openrouter/auto",
      messages,
      temperature,
      max_tokens,
      ...(response_format ? { response_format } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Curated default models — tweak to taste. */
export const MODEL_PRESETS = {
  /** Fast + free: OpenAI GPT-OSS 20B (free tier, reliable) */
  fastFree: "openai/gpt-oss-20b:free",
  /** Quality + free: OpenAI GPT-OSS 120B (free tier, best reliable free option) */
  qualityFree: "openai/gpt-oss-120b:free",
  /** Low-cost audio understanding */
  audioCheap: "openai/gpt-audio-mini",
  /** Paid balanced: Claude 3.5 Sonnet */
  paidBalanced: "anthropic/claude-3.5-sonnet",
  /** Paid top: Claude Sonnet 4.6 (latest) */
  paidTop: "anthropic/claude-sonnet-4.6",
  auto: "openrouter/auto",
} as const;

/**
 * Try a sequence of models in order; on transient failure, fall back.
 * Returns the first non-empty completion. Aggregates errors if every
 * model fails. Useful when free-tier models are rate-limited or down.
 */
export async function generateWithFallback(
  opts: Omit<GenerateOptions, "model"> & { models: string[] },
): Promise<{ content: string; model: string }> {
  const errors: string[] = [];
  for (const model of opts.models) {
    try {
      const content = await generate({ ...opts, model });
      if (content && content.trim()) return { content, model };
      errors.push(`${model}: empty response`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
      // Don't keep retrying on auth errors
      if (msg.includes("401") || msg.includes("403")) break;
    }
  }
  throw new Error(
    `All models failed:\n${errors.map((e) => "  - " + e).join("\n")}`,
  );
}

/** Default fallback chain: fast free → quality free → auto router. */
export const DEFAULT_FALLBACK_CHAIN = [
  MODEL_PRESETS.fastFree,
  MODEL_PRESETS.qualityFree,
  MODEL_PRESETS.auto,
];
