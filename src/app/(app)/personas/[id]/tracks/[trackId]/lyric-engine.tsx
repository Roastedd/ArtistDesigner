"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MODEL_PRESETS } from "@/lib/openrouter";
import { lintLyrics, type LyricLint } from "@/lib/persona-prompt";

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
  const [pov, setPov] = useState<"first" | "second" | "third">("first");
  const [syllables, setSyllables] = useState(7);
  const [hookLine, setHookLine] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

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
  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setSections((s) => {
      const from = s.findIndex((x) => x.id === dragId);
      const to = s.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0) return s;
      const next = [...s];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  }

  function importRawLyrics() {
    const parsed = bodyToSections(importText);
    setSections(parsed);
    setImportText("");
    setShowImport(false);
    toast.success("Lyrics imported — edit away!");
  }

  const fullLint: LyricLint[] = useMemo(
    () => lintLyrics(sectionsToBody(sections)),
    [sections],
  );

  async function generateSection(sec: Section) {
    setBusyId(sec.id);
    try {
      const context = sectionsToBody(sections.filter((s) => s.id !== sec.id));
      const isChorusish = /chorus|hook/i.test(sec.label);
      const lineCount = isChorusish ? 4 : 6;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          mode: "lyrics",
          brief: theme || `Write the ${sec.label}.`,
          model,
          controls: {
            section: sec.label,
            pov,
            syllablesPerLine: syllables,
            lineCount,
            hookLine: hookLine.trim() || undefined,
            explicit,
            context: context || undefined,
            draft: sec.text.trim() || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const cleaned = (data.text as string)
        .replace(/^\[[^\]]+\]\s*/m, "")
        .replace(/^["']|["']$/g, "")
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
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="label">Point of view</div>
              <select
                className="select w-full"
                value={pov}
                onChange={(e) => setPov(e.target.value as typeof pov)}
              >
                <option value="first">1st person (I / me)</option>
                <option value="second">2nd person (you / your)</option>
                <option value="third">3rd person (he / she / they)</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="label">Syllables per line: <span className="text-[color:var(--color-accent)]">{syllables}</span></div>
              <input
                type="range"
                min={5}
                max={12}
                value={syllables}
                onChange={(e) => setSyllables(Number(e.target.value))}
                className="w-full accent-[color:var(--color-accent)]"
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <div className="label">Hook line (chorus anchor) — optional</div>
            <input
              value={hookLine}
              onChange={(e) => setHookLine(e.target.value)}
              placeholder="e.g. 'Stay awake with me'"
              className="input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={explicit}
              onChange={(e) => setExplicit(e.target.checked)}
              className="accent-[color:var(--color-accent)]"
            />
            Allow explicit language
          </label>
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
              <option value={MODEL_PRESETS.paidBalanced}>
                Claude 3.5 Sonnet
              </option>
              <option value={MODEL_PRESETS.paidTop}>Claude Sonnet 4.6</option>
              <option value={MODEL_PRESETS.auto}>OpenRouter auto</option>
            </optgroup>
          </select>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="btn-ghost btn text-xs"
            >
              {showImport ? "▲ Hide import" : "↓ Paste existing lyrics"}
            </button>
            {showImport && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-[color:var(--color-muted)]">
                  Paste your song&apos;s lyrics below. Use{" "}
                  <code className="text-[color:var(--color-accent)]">[Verse 1]</code>{" "}
                  /
                  <code className="text-[color:var(--color-accent)]">[Chorus]</code>{" "}
                  headers to auto-split into sections, or just paste the raw text and split manually.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={10}
                  className="input font-mono text-sm"
                  placeholder={`[Verse 1]\nLyric line one\nLyric line two\n\n[Chorus]\nChorus lines here…`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={importRawLyrics}
                    disabled={!importText.trim()}
                    className="btn"
                  >
                    Import into editor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImportText(""); setShowImport(false); }}
                    className="btn-ghost btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {sections.map((sec) => {
          const sectionLint = lintLyrics(sec.text);
          return (
          <div
            key={sec.id}
            draggable
            onDragStart={() => setDragId(sec.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOn(sec.id)}
            onDragEnd={() => setDragId(null)}
            className={`card space-y-2 ${
              dragId === sec.id ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="cursor-grab select-none text-[color:var(--color-muted)] text-xs px-1"
                title="Drag to reorder"
              >
                ⋮⋮
              </span>
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
            {sectionLint.length > 0 && (
              <ul className="mt-1 space-y-1">
                {sectionLint.map((w, i) => (
                  <li
                    key={i}
                    className="text-[11px] rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 px-2 py-1"
                  >
                    <span className="font-semibold">Lint:</span> {w.why}
                    {w.text && <span className="opacity-70"> — “{w.text}”</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          );
        })}

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
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
            fullLint.length === 0
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <div className="font-semibold">
            Anti-AI lint:{" "}
            {fullLint.length === 0
              ? "Clean ✨"
              : `${fullLint.length} flag${fullLint.length === 1 ? "" : "s"}`}
          </div>
          <div className="opacity-80 mt-0.5">
            {fullLint.length === 0
              ? "No common AI tells detected. Sing it back to yourself to double-check the rhythm."
              : "Edit the highlighted lines or regenerate the section."}
          </div>
        </div>
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
