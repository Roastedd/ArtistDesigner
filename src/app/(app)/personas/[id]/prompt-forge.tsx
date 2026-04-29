"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";

type Mode = "suno" | "lyrics";

export default function PromptForge({ personaId }: { personaId: string }) {
  const [mode, setMode] = useState<Mode>("suno");
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState<string>(MODEL_PRESETS.fastFree);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, mode, brief, model }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">Prompt Forge</h2>
      <p className="text-xs text-[color:var(--color-muted)]">
        Generates with persona DNA auto-injected. Copy-paste output into Suno / Udio.
      </p>

      <div className="flex gap-2">
        {(["suno", "lyrics"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`btn-ghost btn ${mode === m ? "border-[color:var(--color-accent)]" : ""}`}
          >
            {m === "suno" ? "Suno prompt" : "Lyrics"}
          </button>
        ))}
      </div>

      <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
        <optgroup label="Free">
          <option value={MODEL_PRESETS.fastFree}>DeepSeek v3.1 (free)</option>
          <option value={MODEL_PRESETS.qualityFree}>Gemini 2.0 Flash (free)</option>
        </optgroup>
        <optgroup label="Paid">
          <option value={MODEL_PRESETS.paidBalanced}>Claude 3.5 Sonnet</option>
          <option value={MODEL_PRESETS.paidTop}>Claude Sonnet 4.5</option>
          <option value={MODEL_PRESETS.auto}>OpenRouter auto</option>
        </optgroup>
      </select>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        className="input"
        placeholder={mode === "suno"
          ? "Brief: a moody opener, slow build, ends with a glitchy chorus drop"
          : "Brief: track about insomnia and a city that never sleeps; chorus hook should repeat the word 'awake'"}
      />

      <button onClick={generate} disabled={loading || !brief.trim()} className="btn">
        {loading ? "Generating…" : "Generate"}
      </button>

      {output && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <div className="label">Output</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(output);
                toast.success("Copied");
              }}
              className="btn-ghost btn text-xs"
            >
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs bg-[color:var(--color-bg)] border rounded p-3">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
