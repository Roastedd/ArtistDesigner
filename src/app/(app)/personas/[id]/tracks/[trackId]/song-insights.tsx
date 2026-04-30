"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";

type Insights = {
  summary: string;
  strengths: string[];
  weakPoints: string[];
  arrangementIdeas: string[];
  productionIdeas: string[];
  lyricIdeas: string[];
  hookIdeas: string[];
  nextActions: string[];
  assumptions: string[];
};

export function SongInsights({
  personaId,
  trackId,
  hasAudio,
}: {
  personaId: string;
  trackId: string;
  hasAudio: boolean;
}) {
  const [focus, setFocus] = useState(
    "Prioritize arrangement, hook strength, and production polish for streaming release.",
  );
  const [model, setModel] = useState<string>(MODEL_PRESETS.audioCheap);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);

  async function analyzeSong() {
    setLoading(true);
    setInsights(null);
    try {
      const res = await fetch("/api/ai/song-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, trackId, focus, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setInsights(data.insights as Insights);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card mb-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Song Insights</h2>
        {!hasAudio && (
          <span className="text-xs text-[color:var(--color-muted)]">
            Tip: upload audio for stronger analysis.
          </span>
        )}
      </div>

      <p className="text-sm text-[color:var(--color-muted)]">
        Analyze this song and get practical ideas for arrangement, lyrics, hooks, and production.
        For lowest cost, upload a 30-90 second excerpt instead of a full track.
      </p>

      <label className="block">
        <div className="label mb-1">Analysis focus</div>
        <textarea
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          rows={3}
          className="input"
          placeholder="What should the analyzer optimize?"
        />
      </label>

      <label className="block">
        <div className="label mb-1">Model</div>
        <select
          className="select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <optgroup label="Free">
            <option value={MODEL_PRESETS.fastFree}>GPT-OSS 20B (free, fast)</option>
            <option value={MODEL_PRESETS.qualityFree}>GPT-OSS 120B (free, quality)</option>
          </optgroup>
          <optgroup label="Low-cost audio">
            <option value={MODEL_PRESETS.audioCheap}>GPT Audio Mini (cheap, audio-aware)</option>
          </optgroup>
          <optgroup label="Paid">
            <option value={MODEL_PRESETS.paidBalanced}>Claude 3.5 Sonnet</option>
            <option value={MODEL_PRESETS.paidTop}>Claude Sonnet 4.6</option>
            <option value={MODEL_PRESETS.auto}>OpenRouter auto</option>
          </optgroup>
        </select>
      </label>

      <div>
        <button
          type="button"
          onClick={analyzeSong}
          disabled={loading || !focus.trim()}
          className="btn"
        >
          {loading ? "Analyzing…" : "Analyze song"}
        </button>
      </div>

      {insights && (
        <div className="grid md:grid-cols-2 gap-3 pt-2">
          <InsightBlock title="Summary" items={[insights.summary]} />
          <InsightBlock title="Strengths" items={insights.strengths} />
          <InsightBlock title="Weak points" items={insights.weakPoints} />
          <InsightBlock title="Arrangement ideas" items={insights.arrangementIdeas} />
          <InsightBlock title="Production ideas" items={insights.productionIdeas} />
          <InsightBlock title="Lyric ideas" items={insights.lyricIdeas} />
          <InsightBlock title="Hook ideas" items={insights.hookIdeas} />
          <InsightBlock title="Next actions" items={insights.nextActions} />
          {insights.assumptions.length > 0 && (
            <InsightBlock title="Assumptions" items={insights.assumptions} />
          )}
        </div>
      )}
    </section>
  );
}

function InsightBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-[color:var(--color-border)] p-3 space-y-2">
      <div className="label">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-[color:var(--color-muted)]">No items returned.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((item, idx) => (
            <li key={`${title}-${idx}`} className="text-[color:var(--color-fg)]">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
