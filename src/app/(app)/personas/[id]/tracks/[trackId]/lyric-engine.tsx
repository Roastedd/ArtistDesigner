"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";

type Section = { id: string; label: string; text: string };
type StoredSection = { section: string; text: string };
type LyricVersion = {
  id: string;
  body: string;
  structure?: StoredSection[] | null;
  model: string | null;
  createdAt: string;
};

const DEFAULT_SECTIONS: Section[] = [
  { id: cryptoId(), label: "Intro", text: "" },
  { id: cryptoId(), label: "Verse 1", text: "" },
  { id: cryptoId(), label: "Pre-Chorus", text: "" },
  { id: cryptoId(), label: "Chorus", text: "" },
  { id: cryptoId(), label: "Verse 2", text: "" },
  { id: cryptoId(), label: "Bridge", text: "" },
  { id: cryptoId(), label: "Outro", text: "" },
];

function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}

function sectionsToBody(sections: Section[]) {
  return sections
    .filter((s) => s.text.trim())
    .map((s) => `[${s.label}]\n${s.text.trim()}`)
    .join("\n\n");
}

function bodyToSections(body: string): Section[] {
  const blocks = body.split(/\n(?=\[[^\]]+\])/g);
  const sections: Section[] = [];
  for (const b of blocks) {
    const m = b.match(/^\[([^\]]+)\]\s*\n?([\s\S]*)$/);
    if (m) {
      sections.push({ id: cryptoId(), label: m[1], text: m[2].trim() });
    }
  }
  return sections.length ? sections : DEFAULT_SECTIONS;
}

export default function LyricEngine({
  personaId,
  trackId,
  versions,
  onSaved,
}: {
  personaId: string;
  trackId: string;
  versions: LyricVersion[];
  onSaved: (v: LyricVersion) => void;
}) {
  const [sections, setSections] = useState<Section[]>(() => {
    const v = versions[0];
    if (!v) return DEFAULT_SECTIONS;
    if (v.structure && v.structure.length) {
      return v.structure.map((s) => ({
        id: cryptoId(),
        label: s.section,
        text: s.text,
      }));
    }
    return bodyToSections(v.body);
  });
  const [theme, setTheme] = useState("");
  const [model, setModel] = useState<string>(MODEL_PRESETS.fastFree);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(id: string, patch: Partial<Section>) {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function remove(id: string) {
    setSections((s) => s.filter((x) => x.id !== id));
  }
  function add() {
    setSections((s) => [...s, { id: cryptoId(), label: "Section", text: "" }]);
  }
  function move(id: string, dir: -1 | 1) {
    setSections((s) => {
      const i = s.findIndex((x) => x.id === id);
      if (i < 0) return s;
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function generateSection(sec: Section) {
    setBusyId(sec.id);
    try {
      const context = sectionsToBody(sections);
      const brief = [
        `Write the ${sec.label} for this song.`,
        theme ? `Overall theme/brief: ${theme}` : "",
        sec.text.trim()
          ? `Existing draft for this section to refine:\n${sec.text}`
          : "",
        context.trim()
          ? `Existing other sections of the song for continuity:\n${context}`
          : "",
        `Output ONLY the lines for the ${sec.label}. No section header, no commentary.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, mode: "lyrics", brief, model }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const cleaned = (data.text as string)
        .replace(/^\[[^\]]+\]\s*/m, "")
        .trim();
      update(sec.id, { text: cleaned });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveVersion() {
    const body = sectionsToBody(sections);
    if (!body.trim()) {
      toast.error("Nothing to save");
      return;
    }
    const structure: StoredSection[] = sections.map((s) => ({
      section: s.label,
      text: s.text,
    }));
    setSaving(true);
    try {
      const res = await fetch("/api/lyrics/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, body, structure, model }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onSaved({
        id: data.id,
        body,
        structure,
        model,
        createdAt: new Date().toISOString(),
      });
      toast.success("Saved version");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <div className="card space-y-3">
          <h2 className="font-medium">Brief / theme</h2>
          <textarea
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            rows={2}
            className="input"
            placeholder="e.g. insomnia + dead radio frequencies, chorus repeats 'awake'"
          />
          <select
            className="select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <optgroup label="Free">
              <option value={MODEL_PRESETS.fastFree}>DeepSeek v3.1 (free)</option>
              <option value={MODEL_PRESETS.qualityFree}>
                Gemini 2.0 Flash (free)
              </option>
            </optgroup>
            <optgroup label="Paid">
              <option value={MODEL_PRESETS.paidBalanced}>
                Claude 3.5 Sonnet
              </option>
              <option value={MODEL_PRESETS.paidTop}>Claude Sonnet 4.5</option>
              <option value={MODEL_PRESETS.auto}>OpenRouter auto</option>
            </optgroup>
          </select>
        </div>

        {sections.map((sec) => (
          <div key={sec.id} className="card space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={sec.label}
                onChange={(e) => update(sec.id, { label: e.target.value })}
                className="input flex-1 font-medium text-sm"
              />
              <button
                type="button"
                onClick={() => move(sec.id, -1)}
                className="btn-ghost btn text-xs"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(sec.id, 1)}
                className="btn-ghost btn text-xs"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(sec.id)}
                className="btn-ghost btn text-xs"
              >
                ✕
              </button>
            </div>
            <textarea
              value={sec.text}
              onChange={(e) => update(sec.id, { text: e.target.value })}
              rows={4}
              className="input font-mono text-sm"
              placeholder={`Lines for ${sec.label}…`}
            />
            <button
              type="button"
              onClick={() => generateSection(sec)}
              disabled={busyId === sec.id}
              className="btn-ghost btn text-xs"
            >
              {busyId === sec.id ? "Generating…" : "✨ Generate this section"}
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            className="btn-ghost btn"
          >
            + Add section
          </button>
          <button
            type="button"
            onClick={saveVersion}
            disabled={saving}
            className="btn"
          >
            {saving ? "Saving…" : "Save as new version"}
          </button>
        </div>
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
                  onClick={() =>
                    setSections(
                      v.structure && v.structure.length
                        ? v.structure.map((s) => ({
                            id: cryptoId(),
                            label: s.section,
                            text: s.text,
                          }))
                        : bodyToSections(v.body),
                    )
                  }
                  className="hover:text-white"
                >
                  load
                </button>
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
