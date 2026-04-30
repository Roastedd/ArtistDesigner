"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";
import {
  templatesByCategory,
  type PromptTemplateMode,
} from "@/lib/prompt-templates";
import { lintLyrics } from "@/lib/persona-prompt";

type Mode = "suno" | "lyrics";

export default function PromptForge({ personaId }: { personaId: string }) {
  const [mode, setMode] = useState<Mode>("suno");
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState<string>(MODEL_PRESETS.fastFree);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = useMemo(
    () => templatesByCategory(mode as PromptTemplateMode),
    [mode],
  );

  const lyricLints = useMemo(
    () => (mode === "lyrics" && output ? lintLyrics(output) : []),
    [mode, output],
  );

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

      <div className="flex items-center justify-between">
        <div className="label">Brief</div>
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="btn-ghost btn text-xs"
        >
          {showTemplates ? "Hide templates" : "Browse templates →"}
        </button>
      </div>

      {showTemplates && (
        <div className="border border-[color:var(--color-border)] rounded p-3 space-y-3 bg-[color:var(--color-bg)]">
          <p className="text-xs text-[color:var(--color-muted)]">
            One-click starters. The brief gets re-written through the persona DNA, so output stays on-brand.
          </p>
          {templates.map(([category, items]) => (
            <div key={category} className="space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-[color:var(--color-muted)]">
                {category}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setBrief(t.brief);
                      setShowTemplates(false);
                      toast.success(`Loaded: ${t.label}`);
                    }}
                    className="text-left text-xs border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] rounded p-2 transition-colors"
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[color:var(--color-muted)] mt-0.5 line-clamp-2">
                      {t.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
          {mode === "lyrics" ? (
            <LyricOutput body={output} />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs bg-[color:var(--color-bg)] border rounded p-3">
              {output}
            </pre>
          )}
          {mode === "lyrics" && lyricLints.length > 0 && (
            <div className="border border-amber-500/40 bg-amber-500/5 rounded p-3 space-y-1">
              <div className="text-xs font-medium text-amber-300">
                {lyricLints.length} possible AI tell{lyricLints.length === 1 ? "" : "s"}
              </div>
              <ul className="text-[11px] text-[color:var(--color-muted)] space-y-1">
                {lyricLints.slice(0, 6).map((l, i) => (
                  <li key={i}>
                    {l.line > 0 ? (
                      <>
                        <span className="text-amber-300">L{l.line}:</span>{" "}
                        <span className="font-mono">{l.text.slice(0, 60)}</span> — {l.why}
                      </>
                    ) : (
                      l.why
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Render lyric body with [Section] tags highlighted. */
function LyricOutput({ body }: { body: string }) {
  const lines = body.split(/\n/);
  return (
    <pre className="whitespace-pre-wrap font-mono text-xs bg-[color:var(--color-bg)] border rounded p-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isTag = /^\[[^\]]+\]\s*$/.test(trimmed);
        if (isTag) {
          return (
            <span
              key={i}
              className="text-[color:var(--color-accent)] font-semibold"
            >
              {line}
              {"\n"}
            </span>
          );
        }
        return <span key={i}>{line}{"\n"}</span>;
      })}
    </pre>
  );
}
