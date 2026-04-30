"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";
import LyricEngine from "./lyric-engine";

type Version = {
  id: string;
  body: string;
  structure?: { section: string; text: string }[] | null;
  model: string | null;
  createdAt: string;
};
type PromptVersion = {
  id: string;
  body: string;
  model: string | null;
  createdAt: string;
  target: string;
};

export default function TrackStudio({
  personaId,
  trackId,
  initialPrompts,
  initialLyrics,
}: {
  personaId: string;
  trackId: string;
  initialPrompts: PromptVersion[];
  initialLyrics: Version[];
}) {
  const [tab, setTab] = useState<"prompt" | "lyrics">("prompt");
  const [prompts, setPrompts] = useState(initialPrompts);
  const [lyrics, setLyrics] = useState(initialLyrics);

  return (
    <div>
      <nav className="flex gap-1 mb-4">
        {(["prompt", "lyrics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn-ghost btn ${
              tab === t ? "border-[color:var(--color-accent)]" : ""
            }`}
          >
            {t === "prompt" ? "Suno prompts" : "Lyrics"}
          </button>
        ))}
      </nav>

      {tab === "prompt" ? (
        <Generator
          mode="suno"
          personaId={personaId}
          trackId={trackId}
          versions={prompts}
          onSaved={(v) =>
            setPrompts([{ ...v, target: "suno" } as PromptVersion, ...prompts])
          }
        />
      ) : (
        <LyricEngine
          personaId={personaId}
          trackId={trackId}
          versions={lyrics}
          onSaved={(v) => setLyrics([v, ...lyrics])}
        />
      )}
    </div>
  );
}

function Generator({
  mode,
  personaId,
  trackId,
  versions,
  onSaved,
}: {
  mode: "suno" | "lyrics";
  personaId: string;
  trackId: string;
  versions: Version[];
  onSaved: (v: Version) => void;
}) {
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState<string>(MODEL_PRESETS.fastFree);
  const [target, setTarget] = useState<"suno" | "udio" | "riffusion">("suno");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate(save: boolean) {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          mode,
          brief,
          model,
          ...(mode === "suno" ? { target } : {}),
          ...(save ? { saveTo: { trackId } } : {}),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data.text);
      if (save && data.saved) {
        onSaved({
          id: data.saved.id,
          body: data.text,
          model,
          createdAt: new Date().toISOString(),
        });
        toast.success("Saved version");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div className="card space-y-3">
        <h2 className="font-medium">
          {mode === "suno"
            ? `Generate ${target.charAt(0).toUpperCase() + target.slice(1)} prompt`
            : "Write lyrics"}
        </h2>
        {mode === "suno" && (
          <label className="block">
            <div className="label mb-1">Target tool</div>
            <select
              className="select"
              value={target}
              onChange={(e) =>
                setTarget(e.target.value as "suno" | "udio" | "riffusion")
              }
            >
              <option value="suno">Suno</option>
              <option value="udio">Udio</option>
              <option value="riffusion">Riffusion</option>
            </select>
          </label>
        )}
        <select
          className="select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <optgroup label="Free">
            <option value={MODEL_PRESETS.fastFree}>GPT-OSS 20B (free, fast)</option>
            <option value={MODEL_PRESETS.qualityFree}>
              GPT-OSS 120B (free, quality)
            </option>
          </optgroup>
          <optgroup label="Paid">
            <option value={MODEL_PRESETS.paidBalanced}>Claude 3.5 Sonnet</option>
            <option value={MODEL_PRESETS.paidTop}>Claude Sonnet 4.6</option>
            <option value={MODEL_PRESETS.auto}>OpenRouter auto</option>
          </optgroup>
        </select>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          className="input"
          placeholder={
            mode === "suno"
              ? "Brief: slow simmer opener, breathy vocal, glitchy chorus drop, no acoustic guitar"
              : "Brief: insomnia + dead radio frequencies, chorus repeats 'awake', verse 2 turns sinister"
          }
        />
        <div className="flex gap-2">
          <button
            onClick={() => generate(false)}
            disabled={loading || !brief.trim()}
            className="btn-ghost btn"
          >
            {loading ? "Generating…" : "Preview"}
          </button>
          <button
            onClick={() => generate(true)}
            disabled={loading || !brief.trim()}
            className="btn"
          >
            Generate & save
          </button>
        </div>

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

      <aside>
        <div className="label mb-2">Version history</div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {versions.length === 0 && (
            <div className="text-xs text-[color:var(--color-muted)] card">
              No versions yet.
            </div>
          )}
          {versions.map((v) => (
            <div key={v.id} className="card p-3 space-y-1">
              <div className="flex justify-between text-[10px] text-[color:var(--color-muted)]">
                <span>{new Date(v.createdAt).toLocaleString()}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(v.body);
                    toast.success("Copied");
                  }}
                  className="hover:text-white"
                >
                  copy
                </button>
              </div>
              <div className="text-[10px] font-mono text-[color:var(--color-muted)]">
                {v.model ?? "—"}
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] line-clamp-6">
                {v.body}
              </pre>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
