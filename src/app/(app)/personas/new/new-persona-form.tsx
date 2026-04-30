"use client";

import { useState, useActionState, useTransition, useRef } from "react";
import { Loader2, Sparkles, PenLine, RefreshCw, ChevronRight } from "lucide-react";
import { brainstormPersona } from "./brainstorm-action";
import { createPersona } from "../actions";
import type { BrainstormResult } from "./brainstorm-action";

/* ─── helpers ─────────────────────────────────────────── */

function Field({
  label,
  name,
  value,
  placeholder,
  multiline,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="label block">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          defaultValue={value}
          placeholder={placeholder}
          rows={3}
          className="input resize-none"
        />
      ) : (
        <input
          id={name}
          name={name}
          defaultValue={value}
          placeholder={placeholder}
          className="input"
        />
      )}
    </div>
  );
}

/* ─── Brainstorm panel ────────────────────────────────── */

function BrainstormPanel({
  onFill,
}: {
  onFill: (r: BrainstormResult) => void;
}) {
  const [state, action, pending] = useActionState(brainstormPersona, null);

  // When we get a successful result, bubble it up
  const prevOk = useRef(false);
  if (state?.ok && !prevOk.current) {
    prevOk.current = true;
    onFill(state.result);
  }
  if (!state?.ok) prevOk.current = false;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="vibe" className="label block">
          Describe the vibe
        </label>
        <textarea
          id="vibe"
          name="vibe"
          required
          rows={4}
          maxLength={600}
          placeholder={
            "e.g. A melancholic synth-pop ghost who haunts old cassette tapes — " +
            "80s aesthetic, breathy female vocals, themes of memory and loss"
          }
          className="input resize-none leading-relaxed"
        />
        <p className="text-xs text-[color:var(--color-muted)]">
          Style, mood, sound, story, era — anything helps. Max 600 chars.
        </p>
      </div>

      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 animate-[fadeSlideDown_200ms_ease_both]"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn w-full justify-center gap-2"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating ideas…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate ideas
          </>
        )}
      </button>
    </form>
  );
}

/* ─── Name picker ─────────────────────────────────────── */

function NamePicker({
  names,
  chosen,
  onChange,
}: {
  names: [string, string, string];
  chosen: string;
  onChange: (n: string) => void;
}) {
  const [custom, setCustom] = useState(false);

  return (
    <div className="space-y-2">
      <div className="label">Pick a name</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(n);
            }}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-all ${
              !custom && chosen === n
                ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
                : "border-[color:var(--color-border)] hover:border-[color:var(--color-accent)]/50 hover:bg-[color:var(--color-bg-elev)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setCustom(true);
          onChange("");
        }}
        className="text-xs text-[color:var(--color-muted)] underline-offset-2 hover:text-[color:var(--color-fg)] hover:underline transition-colors"
      >
        Type my own…
      </button>
      {custom && (
        <input
          autoFocus
          className="input animate-[fadeSlideDown_150ms_ease_both]"
          placeholder="Custom artist name"
          value={chosen}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/* ─── Review & edit panel ─────────────────────────────── */

function ReviewPanel({
  result,
  onReset,
}: {
  result: BrainstormResult;
  onReset: () => void;
}) {
  const [name, setName] = useState(result.names[0]);
  const [submitting, startSubmit] = useTransition();

  async function handleSubmit(formData: FormData) {
    // Inject the picked name (not in the hidden input by default)
    formData.set("name", name);
    startSubmit(() => createPersona(formData));
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Name picker */}
      <NamePicker names={result.names} chosen={name} onChange={setName} />

      <div className="h-px bg-[color:var(--color-border)]" />

      {/* All other fields — pre-filled, fully editable */}
      <Field
        label="Tagline"
        name="tagline"
        value={result.tagline}
        placeholder="One punchy line"
      />
      <Field
        label="Bio"
        name="bio"
        value={result.bio}
        placeholder="Artist bio"
        multiline
      />
      <Field
        label="Genres (comma-separated)"
        name="genres"
        value={result.genres}
        placeholder="e.g. synth-pop, dream-pop"
      />
      <Field
        label="Vocal style"
        name="vocalStyle"
        value={result.vocalStyle}
        placeholder="e.g. breathy alto, vocoded"
      />
      <Field
        label="Instrumentation (comma-separated)"
        name="instrumentation"
        value={result.instrumentation}
        placeholder="e.g. Juno-106, 808, cassette noise"
      />
      <Field
        label="Mix aesthetic"
        name="mixAesthetic"
        value={result.mixAesthetic}
        placeholder="e.g. lo-fi bedroom with heavy reverb"
      />
      <Field
        label="Influences (comma-separated)"
        name="influences"
        value={result.influences}
        placeholder="e.g. Kate Bush, Grouper"
      />
      <Field
        label="Lyric motifs / vocabulary themes (comma-separated)"
        name="motifs"
        value={result.motifs}
        placeholder="e.g. memory, distance, static"
      />
      <Field
        label="Personality (comma-separated)"
        name="personality"
        value={result.personality}
        placeholder="e.g. Mischievous, Hyperactive, Electric"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="BPM min"
          name="bpmMin"
          value={String(result.bpmMin)}
          placeholder="90"
        />
        <Field
          label="BPM max"
          name="bpmMax"
          value={String(result.bpmMax)}
          placeholder="120"
        />
      </div>
      <Field
        label="Key tendencies"
        name="keyTendencies"
        value={result.keyTendencies}
        placeholder="C minor, F# minor"
      />
      <Field
        label="Lyrical tone"
        name="lyricalTone"
        value={result.lyricalTone}
        placeholder="saccharine but subtly nihilistic"
      />
      <Field
        label="Visual aesthetic"
        name="visualAesthetic"
        value={result.visualAesthetic}
        placeholder="hand-drawn 2D anime, neon palette"
        multiline
      />
      <Field
        label="Themes"
        name="themes"
        value={result.themes}
        placeholder="digital escapism, candy-coated chaos"
      />
      <Field
        label="Target audience"
        name="targetAudience"
        value={result.targetAudience}
        placeholder="Gen Z digital natives"
      />
      <Field
        label="Color palette (hex, comma-separated)"
        name="colorPalette"
        value={result.colorPalette}
        placeholder="#ff66cc, #00e6ff, #1a0033"
      />

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="btn flex-1 justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              Create persona
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          title="Start over"
          className="btn-ghost btn shrink-0 gap-1.5 px-3"
        >
          <RefreshCw className="h-4 w-4" />
          Redo
        </button>
      </div>
    </form>
  );
}

/* ─── Main export ─────────────────────────────────────── */

export function NewPersonaForm() {
  const [mode, setMode] = useState<"manual" | "brainstorm">("brainstorm");
  const [brainstormResult, setBrainstormResult] =
    useState<BrainstormResult | null>(null);

  return (
    <div className="max-w-xl space-y-6">
      {/* Mode switcher */}
      <div
        className="relative flex rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-1 text-sm font-medium"
        role="tablist"
      >
        <div
          aria-hidden="true"
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-[color:var(--color-accent)] shadow-sm transition-transform duration-200 ease-out ${
            mode === "manual"
              ? "translate-x-[calc(100%+8px)]"
              : "translate-x-0"
          }`}
          style={{ left: 4 }}
        />
        <button
          role="tab"
          type="button"
          aria-selected={mode === "brainstorm"}
          onClick={() => setMode("brainstorm")}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 transition-colors duration-150 ${
            mode === "brainstorm"
              ? "text-[color:var(--color-accent-fg)]"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Brainstorm with AI
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === "manual"}
          onClick={() => setMode("manual")}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 transition-colors duration-150 ${
            mode === "manual"
              ? "text-[color:var(--color-accent-fg)]"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" />
          Manual
        </button>
      </div>

      {/* Panel */}
      <div className="card p-6 animate-[fadeSlideDown_200ms_ease_both]" key={mode}>
        {mode === "brainstorm" ? (
          brainstormResult ? (
            <ReviewPanel
              result={brainstormResult}
              onReset={() => setBrainstormResult(null)}
            />
          ) : (
            <BrainstormPanel onFill={setBrainstormResult} />
          )
        ) : (
          /* Manual form — same fields as before */
          <form action={createPersona} className="space-y-4">
            <Field label="Name *" name="name" placeholder="e.g. NOVA-7" />
            <Field
              label="Tagline"
              name="tagline"
              placeholder="A glitch-soul ghost from a dead radio station"
            />
            <Field label="Bio" name="bio" multiline />
            <Field
              label="Genres (comma-separated)"
              name="genres"
              placeholder="alt-r&b, glitch-pop, trip-hop"
            />
            <Field
              label="Vocal style"
              name="vocalStyle"
              placeholder="breathy alto, autotuned ad-libs"
            />
            <button type="submit" className="btn w-full justify-center">
              Create persona
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
