/**
 * Thin OpenRouter client. Use any model slug from
 * https://openrouter.ai/models — including free tiers
 * (e.g. "deepseek/deepseek-chat-v3.1:free", "google/gemini-2.0-flash-exp:free").
 */
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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
  fastFree: "deepseek/deepseek-chat-v3.1:free",
  qualityFree: "google/gemini-2.0-flash-exp:free",
  paidBalanced: "anthropic/claude-3.5-sonnet",
  paidTop: "anthropic/claude-sonnet-4.5",
  auto: "openrouter/auto",
} as const;
