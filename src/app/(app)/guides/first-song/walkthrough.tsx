"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Music,
  RotateCcw,
  Sparkles,
  Sliders,
  Send,
  Wand2,
  X,
} from "lucide-react";
import FileUpload from "@/components/file-upload";
import { templatesByCategory, type PromptTemplateMode } from "@/lib/prompt-templates";
import { lintLyrics } from "@/lib/persona-prompt";
import {
  dismissOnboarding,
  resetOnboarding,
  setOnboardingPlatform,
  setOnboardingStep,
} from "./actions";
import { importExternalClip } from "../../personas/suno-capture-actions";

type Persona = { id: string; name: string };
type Platform = "suno" | "udio";

const TOTAL_STEPS = 9;

const STEP_TITLES = [
  "Pick your platform",
  "Pick (or create) an artist",
  "Write your lyrics",
  "Build your style prompt",
  "Generate on the platform",
  "Save it back here",
  "Master in your DAW",
  "AI mix & master review",
  "Distribute to streaming",
] as const;

export function Walkthrough({
  initialStep,
  initialPlatform,
  personas,
}: {
  initialStep: number;
  initialPlatform: Platform | null;
  personas: Persona[];
}) {
  const [step, setStep] = useState(Math.min(initialStep, TOTAL_STEPS - 1));
  const [platform, setPlatform] = useState<Platform | null>(initialPlatform);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const completed = initialStep >= TOTAL_STEPS;

  // Restore selected artist from localStorage; clear if it no longer exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("firstSong:personaId");
    if (saved && personas.some((p) => p.id === saved)) {
      setSelectedPersonaId(saved);
    } else if (personas.length === 1) {
      setSelectedPersonaId(personas[0].id);
    }
  }, [personas]);

  function pickPersona(id: string) {
    setSelectedPersonaId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("firstSong:personaId", id);
    }
  }

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) ?? null;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, next));
    setStep(clamped);
    // Persist the highest reached step.
    start(async () => {
      await setOnboardingStep(Math.max(initialStep, clamped));
    });
  }

  function pickPlatform(p: Platform) {
    setPlatform(p);
    start(async () => {
      await setOnboardingPlatform(p);
    });
  }

  function finish() {
    start(async () => {
      await setOnboardingStep(TOTAL_STEPS);
      toast.success("Nice! You finished your first song walkthrough.");
    });
  }

  function dismiss() {
    start(async () => {
      await dismissOnboarding();
      toast.success("Hidden from dashboard. Find it again under Guides.");
    });
  }

  function reset() {
    start(async () => {
      await resetOnboarding();
      setStep(0);
      setPlatform(null);
      toast.success("Walkthrough reset.");
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[color:var(--color-accent)]" />
            Make your first song
          </h1>
          <p className="text-[color:var(--color-muted)] mt-1">
            A {TOTAL_STEPS}-step walkthrough for Suno or Udio. Your progress
            saves automatically.
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            ⏱ ~30 minutes for your first take · No music background required
          </p>
        </div>
        <div className="flex gap-2">
          {completed && (
            <button
              onClick={reset}
              disabled={pending}
              className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[color:var(--color-bg-elev)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
          )}
          <button
            onClick={dismiss}
            disabled={pending}
            className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[color:var(--color-bg-elev)]"
          >
            <X className="h-3.5 w-3.5" /> Hide from dashboard
          </button>
        </div>
      </div>

      {/* Progress */}
      <ol className="grid grid-cols-9 gap-1.5">
        {STEP_TITLES.map((t, i) => {
          const reached = i <= Math.max(initialStep, step);
          const done = i < initialStep;
          const current = i === step;
          return (
            <li key={t}>
              <button
                onClick={() => go(i)}
                title={`${i + 1}. ${t}${done ? " (done)" : ""}`}
                className={`w-full h-7 rounded-md text-[11px] font-medium inline-flex items-center justify-center gap-1 transition-colors ${
                  current
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
                    : done
                      ? "bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)]/30"
                      : reached
                        ? "bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-border)]"
                        : "bg-[color:var(--color-bg-elev)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
                }`}
                aria-label={`Step ${i + 1}: ${t}`}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <Glossary />

      {/* Step body */}
      <section className="card space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          <span>Step {step + 1} of {TOTAL_STEPS}</span>
          {step < initialStep && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)] normal-case tracking-normal">
              <Check className="h-3 w-3" /> Done
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold">{STEP_TITLES[step]}</h2>        {step === 0 && (
          <PlatformPicker selected={platform} onSelect={pickPlatform} />
        )}
        {step === 1 && (
          <ArtistStep
            personas={personas}
            selectedId={selectedPersonaId}
            onSelect={pickPersona}
          />
        )}
        {step === 2 && (
          <LyricsStep selectedPersona={selectedPersona} platform={platform} />
        )}
        {step === 3 && (
          <StyleStep selectedPersona={selectedPersona} platform={platform} />
        )}
        {step === 4 && <GenerateStep platform={platform} />}
        {step === 5 && <SaveStep selectedPersona={selectedPersona} />}
        {step === 6 && <MasterStep />}
        {step === 7 && <AnalyzeStep />}
        {step === 8 && <DistributeStep onFinish={finish} />}
      </section>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0 || pending}
          className="btn-ghost inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < TOTAL_STEPS - 1 ? (
          <button
            onClick={() => go(step + 1)}
            disabled={
              pending ||
              (step === 0 && !platform) ||
              (step === 1 && !selectedPersonaId && personas.length > 0)
            }
            title={
              step === 1 && !selectedPersonaId && personas.length > 0
                ? "Pick an artist to continue"
                : undefined
            }
            className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={pending}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> I'm ready to release
          </button>
        )}
      </div>

      {completed && step === TOTAL_STEPS - 1 && (
        <div className="card border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/5">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
            You've finished this walkthrough — but feel free to revisit any
            step.
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── steps ───────────────── */

/**
 * Inline generator embedded in the walkthrough so users can produce
 * lyrics / Suno prompts without navigating to the persona detail page.
 * Falls back to a "pick an artist first" message if no persona is selected.
 */
function InlineForge({
  persona,
  mode,
  placeholder,
}: {
  persona: { id: string; name: string } | null;
  mode: "suno" | "lyrics";
  placeholder: string;
}) {
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  // Default to the better free model for lyrics so output is less corny.
  const [model, setModel] = useState<string>(
    mode === "lyrics"
      ? "openai/gpt-oss-120b:free"
      : "openai/gpt-oss-20b:free",
  );

  const templates = useMemo(
    () => templatesByCategory(mode as PromptTemplateMode),
    [mode],
  );
  const lints = useMemo(
    () => (mode === "lyrics" && output ? lintLyrics(output) : []),
    [mode, output],
  );

  async function generate() {
    if (!persona) return;
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          mode,
          brief,
          model,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `Failed (${res.status})`);
      }
      const data = await res.json();
      setOutput(data.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied — paste into your platform");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  }

  if (!persona) {
    return (
      <div className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-muted)]">
        Pick an artist in step 2 to enable the in-line generator here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)] inline-flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
          Generate {mode === "lyrics" ? "lyrics" : "Suno/Udio prompt"} for{" "}
          <strong className="text-[color:var(--color-fg)]">{persona.name}</strong>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="text-xs text-[color:var(--color-accent)] hover:underline"
        >
          {showTemplates ? "Hide templates" : "Browse templates →"}
        </button>
      </div>

      {showTemplates && (
        <div className="space-y-2 max-h-56 overflow-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-2">
          {templates.map(([category, items]) => (
            <div key={category} className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]">
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
        rows={3}
        className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-sm font-mono"
        placeholder={placeholder}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={generate}
          disabled={loading || !brief.trim()}
          className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate
            </>
          )}
        </button>
        <label className="text-[11px] text-[color:var(--color-muted)] inline-flex items-center gap-1.5 ml-auto">
          Model:
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded px-1.5 py-0.5 text-xs"
          >
            <optgroup label="Free">
              <option value="openai/gpt-oss-20b:free">GPT-OSS 20B (fast)</option>
              <option value="openai/gpt-oss-120b:free">GPT-OSS 120B (better)</option>
            </optgroup>
            <optgroup label="Paid (best quality)">
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</option>
            </optgroup>
          </select>
        </label>
      </div>
      {mode === "lyrics" && (
        <p className="text-[11px] text-[color:var(--color-muted)]">
          Output too generic? Re-roll, or switch to Claude Sonnet 4.6 for noticeably grittier writing.
        </p>
      )}

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wide text-[color:var(--color-muted)]">
              Output
            </div>
            <button
              onClick={copy}
              className="text-xs inline-flex items-center gap-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          {mode === "lyrics" ? (
            <LyricBlock body={output} />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded p-3 max-h-72 overflow-auto">
              {output}
            </pre>
          )}
          {mode === "lyrics" && lints.length > 0 && (
            <div className="border border-amber-500/40 bg-amber-500/5 rounded p-2 space-y-1">
              <div className="text-xs font-medium text-amber-300">
                {lints.length} possible AI tell{lints.length === 1 ? "" : "s"} —
                consider rewriting
              </div>
              <ul className="text-[11px] text-[color:var(--color-muted)] space-y-0.5">
                {lints.slice(0, 5).map((l, i) => (
                  <li key={i}>
                    {l.line > 0 ? (
                      <>
                        <span className="text-amber-300">L{l.line}:</span>{" "}
                        <span className="font-mono">{l.text.slice(0, 60)}</span>{" "}
                        — {l.why}
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

function LyricBlock({ body }: { body: string }) {
  const lines = body.split(/\n/);
  return (
    <pre className="whitespace-pre-wrap font-mono text-xs bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded p-3 max-h-80 overflow-auto leading-relaxed">
      {lines.map((line, i) => {
        const isTag = /^\[[^\]]+\]\s*$/.test(line.trim());
        return isTag ? (
          <span
            key={i}
            className="text-[color:var(--color-accent)] font-semibold"
          >
            {line}
            {"\n"}
          </span>
        ) : (
          <span key={i}>
            {line}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

function Glossary() {
  const [open, setOpen] = useState(false);
  const terms: { term: string; def: string }[] = [
    { term: "Suno / Udio", def: "AI websites that generate full songs (vocals + instruments) from your lyrics and a style description." },
    { term: "Custom / Manual Mode", def: "The mode in Suno/Udio that lets you paste your own lyrics instead of having the AI write them." },
    { term: "Style prompt", def: "A short, comma-separated description of how the song should sound (e.g. 'indie pop, female alto, 110 BPM, anthemic')." },
    { term: "Section tags", def: "Brackets like [Verse 1], [Chorus], [Bridge] that tell the AI how to structure the song." },
    { term: "BPM", def: "Beats per minute — the song's tempo. 60–80 = slow ballad, 90–110 = mid-tempo, 120–140 = upbeat, 140+ = fast/dance." },
    { term: "DAW", def: "Digital Audio Workstation — the app you use to master (FL Studio, Ableton, Logic, GarageBand, Reaper)." },
    { term: "Master / Mastering", def: "The final polish that makes your song loud and consistent enough for streaming services." },
    { term: "LUFS", def: "Loudness Units Full Scale — how loud your song is. Spotify targets -14 LUFS integrated." },
    { term: "True Peak (dBTP)", def: "The actual peak loudness. Keep it below -1.0 dBTP to avoid distortion on streaming." },
    { term: "WAV vs MP3", def: "WAV is uncompressed (best quality, big file). MP3 is compressed (smaller, slight quality loss). Distributors require WAV." },
    { term: "Distributor", def: "A service (DistroKid, TuneCore, CD Baby) that puts your song on Spotify, Apple Music, etc." },
    { term: "ISRC / UPC", def: "Free tracking codes the distributor generates so platforms can count your streams. Don't pay extra for these." },
  ];
  return (
    <details
      className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]"
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-xs uppercase tracking-wider text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] flex items-center justify-between">
        <span>📚 Glossary — what do these words mean?</span>
        <span className="text-[10px]">{open ? "Hide" : "Show"}</span>
      </summary>
      <dl className="px-3 pb-3 grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {terms.map((t) => (
          <div key={t.term}>
            <dt className="font-semibold text-[color:var(--color-fg)]">{t.term}</dt>
            <dd className="text-[color:var(--color-muted)]">{t.def}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function PlatformPicker({
  selected,
  onSelect,
}: {
  selected: Platform | null;
  onSelect: (p: Platform) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm space-y-1.5">
        <div className="font-semibold">First time? Read this.</div>
        <p className="text-[color:var(--color-muted)] text-xs leading-relaxed">
          <strong>Suno</strong> and <strong>Udio</strong> are AI websites that
          turn lyrics + a short style description into a finished song with
          vocals. ArtistDesigner doesn&apos;t make audio — it gives you the{" "}
          <em>perfect lyrics and style prompt</em> to paste into one of them.
          Both have free credits to start, and you only need to pick one.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <PlatformCard
          name="suno"
          title="Suno"
          tagline="Best for: full songs, polished mixes, sing-along hooks"
          bullets={[
            "Strong vocal clarity & studio polish",
            "Great at pop, R&B, hip-hop, country",
            "Custom Mode supports section tags ([Verse], [Chorus])",
            "Free tier: 50 credits/day (~10 songs)",
          ]}
          signupUrl="https://suno.com"
          selected={selected === "suno"}
          onSelect={() => onSelect("suno")}
        />
        <PlatformCard
          name="udio"
          title="Udio"
          tagline="Best for: experimental textures, longer extends, niche genres"
          bullets={[
            "Excellent instrumental nuance & timbre",
            "Great at electronic, jazz, ambient, world",
            "Strong 'extend' / remix flow with manual prompt control",
            "Free tier: 10 generations/day",
          ]}
          signupUrl="https://www.udio.com"
          selected={selected === "udio"}
          onSelect={() => onSelect("udio")}
        />
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        Pick one to continue. You can change later — your progress saves either way.
      </p>
    </div>
  );
}

function PlatformCard({
  title,
  tagline,
  bullets,
  signupUrl,
  selected,
  onSelect,
}: {
  name: Platform;
  title: string;
  tagline: string;
  bullets: string[];
  signupUrl: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5"
          : "border-[color:var(--color-border)] hover:border-[color:var(--color-accent)]/50"
      }`}
    >
      <button onClick={onSelect} className="text-left w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold">{title}</span>
          {selected && (
            <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
          )}
        </div>
        <p className="text-xs text-[color:var(--color-muted)] mb-3">{tagline}</p>
        <ul className="text-xs space-y-1 mb-3">
          {bullets.map((b) => (
            <li key={b} className="flex gap-1.5">
              <span className="text-[color:var(--color-accent)]">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </button>
      <a
        href={signupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[color:var(--color-accent)] hover:opacity-80 inline-flex items-center gap-1"
      >
        Don&apos;t have an account? Sign up free <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function ArtistStep({
  personas,
  selectedId,
  onSelect,
}: {
  personas: Persona[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (personas.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[color:var(--color-muted)]">
          Every song needs an artist. Your artist's DNA — genre, vocals, era,
          mood — drives the style prompt and keeps releases consistent.
        </p>
        <div className="card border-dashed">
          <div className="text-sm mb-3">You don't have an artist yet.</div>
          <a
            href="/personas/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Generate one in a new tab
          </a>
        </div>
        <p className="text-xs text-[color:var(--color-muted)]">
          Come back to this tab when you're done — your progress is saved.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--color-muted)]">
        Pick the artist this song belongs to. The next steps will deep-link
        you straight into their lyrics, prompts, and tracks.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {personas.slice(0, 12).map((p) => {
          const active = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`card text-left flex items-center justify-between text-sm transition-colors ${
                active
                  ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10"
                  : "hover:border-[color:var(--color-accent)]"
              }`}
            >
              <span className="font-medium truncate">{p.name}</span>
              {active ? (
                <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
              ) : (
                <span className="text-xs text-[color:var(--color-muted)]">
                  Select
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedId && (
        <div className="flex items-center gap-2 text-xs">
          <Check className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
          <span className="text-[color:var(--color-muted)]">
            Selected. Hit Next to continue.
          </span>
          <a
            href={`/personas/${selectedId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      <a
        href="/personas/new"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[color:var(--color-accent)] hover:opacity-80 inline-flex items-center gap-1"
      >
        <Sparkles className="h-3.5 w-3.5" /> or generate a new one (new tab)
      </a>
    </div>
  );
}

function LyricsStep({
  selectedPersona,
  platform,
}: {
  selectedPersona: Persona | null;
  platform: Platform | null;
}) {
  const [source, setSource] = useState<"forge" | "platform">("forge");
  const platformName = platform === "udio" ? "Udio" : "Suno";

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Lyrics are the words your AI singer will perform. {platformName}{" "}
        reads <strong>section tags</strong> like <code>[Verse 1]</code> and{" "}
        <code>[Chorus]</code> and shapes the song around them. Pick how you
        want to write yours:
      </p>

      <div className="flex gap-1 border-b border-[color:var(--color-border)]">
        <SourceTab
          active={source === "forge"}
          onClick={() => setSource("forge")}
          label={`Generate here (on-brand)`}
        />
        <SourceTab
          active={source === "platform"}
          onClick={() => setSource("platform")}
          label={`Let ${platformName} write them`}
        />
      </div>

      {source === "forge" ? (
        <ForgeLyricsPath
          selectedPersona={selectedPersona}
          platformName={platformName}
        />
      ) : (
        <PlatformLyricsPath platform={platform} />
      )}
    </div>
  );
}

function SourceTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? "border-[color:var(--color-accent)] text-[color:var(--color-fg)] font-medium"
          : "border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
      }`}
    >
      {label}
    </button>
  );
}

function ForgeLyricsPath({
  selectedPersona,
  platformName,
}: {
  selectedPersona: Persona | null;
  platformName: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-[color:var(--color-muted)]">
        Best for: keeping every release on-brand. Lyrics are written in your
        artist&apos;s voice (era, slang, themes from their DNA) and arrive
        with full <code>[Verse]/[Chorus]/[Bridge]</code> structure.
      </p>

      <InlineForge
        persona={selectedPersona}
        mode="lyrics"
        placeholder="Brief: a song about driving home in the rain after a fight, chorus repeats 'we drive on'"
      />

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
        <div className="font-semibold text-amber-300">Quality rules</div>
        <ul className="space-y-0.5 list-disc pl-4 text-[color:var(--color-muted)]">
          <li>
            Use <code>[Verse 1] / [Pre-Chorus] / [Chorus] / [Verse 2] / [Chorus] / [Bridge] / [Chorus] / [Outro]</code>
          </li>
          <li>Repeat the chorus exactly each time — it teaches the model the hook.</li>
          <li>One thought per line. No stage directions inside the lyric body.</li>
          <li>{platformName} caps lyrics around <strong>3000 characters</strong>. Trim if longer.</li>
        </ul>
      </div>
    </div>
  );
}

function PlatformLyricsPath({ platform }: { platform: Platform | null }) {
  const isUdio = platform === "udio";
  const name = isUdio ? "Udio" : "Suno";
  return (
    <div className="space-y-3">
      <p className="text-xs text-[color:var(--color-muted)]">
        Best for: when you just want a song fast. {name} writes lyrics from
        a one-line prompt — no structure work needed. Trade-off: it won&apos;t
        match your artist&apos;s voice as closely.
      </p>

      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          How to do it on {name}
        </div>
        {isUdio ? (
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>
              Open{" "}
              <a
                href="https://www.udio.com/create"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                udio.com/create
              </a>{" "}
              and sign in.
            </li>
            <li>
              Leave <strong>Manual Mode</strong> OFF (default).
            </li>
            <li>
              In the prompt box, type a <strong>one-line song idea</strong>{" "}
              + style tags: <em>&quot;a song about driving home in the rain
              after a fight, indie pop, female alto, 110 BPM&quot;</em>
            </li>
            <li>
              Click <strong>Create</strong>. Udio writes the lyrics + audio
              together. You&apos;ll see the lyrics appear on the track when
              it finishes.
            </li>
            <li>
              Like the lyrics but want to tweak? Click the track →{" "}
              <strong>View lyrics</strong> → copy them, then switch to Manual
              Mode and edit before regenerating.
            </li>
          </ol>
        ) : (
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>
              Open{" "}
              <a
                href="https://suno.com/create"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                suno.com/create
              </a>{" "}
              and sign in.
            </li>
            <li>
              Make sure the top toggle is on <strong>Simple</strong> (NOT
              Custom).
            </li>
            <li>
              In the &quot;Song description&quot; box, type your idea +
              style: <em>&quot;a song about driving home in the rain after a
              fight, indie pop, female alto, 110 BPM, anthemic chorus&quot;</em>
            </li>
            <li>
              Confirm <strong>Instrumental</strong> is OFF.
            </li>
            <li>
              Click <strong>Create</strong>. Suno writes lyrics + audio
              together (2 takes).
            </li>
            <li>
              To edit the AI-written lyrics: click the track → ⋯ menu →{" "}
              <strong>Edit lyrics</strong>, paste your tweaks, then{" "}
              <strong>Re-generate</strong>.
            </li>
          </ol>
        )}
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
        <div className="font-semibold text-amber-300">Hybrid trick (recommended)</div>
        <p className="text-[color:var(--color-muted)]">
          Let {name} write a first draft for free, then come back to the
          &quot;Generate here&quot; tab and paste those lyrics into the
          brief field as a starting point — the AI will rewrite them in your
          artist&apos;s voice while keeping the structure.
        </p>
      </div>
    </div>
  );
}

function StyleStep({
  selectedPersona,
  platform,
}: {
  selectedPersona: Persona | null;
  platform: Platform | null;
}) {
  const example =
    platform === "udio"
      ? "moody synthwave, female alto vocals, analog drum machine, reverb-soaked guitar, 90 BPM, late-night drive, vintage 1985"
      : "indie pop rock, male tenor lead, jangly guitars, punchy drums, warm analog synths, 110 BPM, anthemic chorus, festival-ready";
  const platformName = platform === "udio" ? "Udio" : "Suno";
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        The <strong>style prompt</strong> tells {platformName} <em>how</em>{" "}
        the song should sound — genre, voice, instruments, mood. Aim for 6–12
        short comma-separated tags.
      </p>

      <InlineForge
        persona={selectedPersona}
        mode="suno"
        placeholder="Brief: a dark, slow-burn opener that drops at 1:20, festival-ready chorus"
      />

      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Or copy the persona&apos;s default prompt
        </div>
        <ol className="text-sm space-y-2 list-decimal pl-5">
          <li>
            {selectedPersona ? (
              <>
                Back on{" "}
                <a
                  href={`/personas/${selectedPersona.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
                >
                  <strong>{selectedPersona.name}</strong>{" "}
                  <ExternalLink className="h-3 w-3" />
                </a>
                , find the &quot;AI Music Generator Prompt&quot; card near the
                top.
              </>
            ) : (
              <>Open your artist&apos;s page.</>
            )}
          </li>
          <li>
            That card already has a ready-to-paste prompt built from your
            artist&apos;s DNA. Hit <strong>Copy</strong> to grab it.
          </li>
          <li>
            <em>Want a custom prompt for this specific song?</em> Open{" "}
            <strong>Prompt Forge</strong> on the right, switch to the{" "}
            <strong>Suno prompt</strong> tab, type your brief (e.g. &quot;a
            dark, slow-burn opener that drops at 1:20&quot;), and click{" "}
            <strong>Generate</strong>.
          </li>
          <li>
            Hit <strong>Copy</strong> on the output. You&apos;ll paste this
            alongside your lyrics in {platformName}.
          </li>
        </ol>
      </div>

      <CopyBlock
        label={`Example ${platformName} style prompt`}
        text={example}
        lang="text"
      />

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
        <div className="font-semibold text-amber-300">Pro tips</div>
        <ul className="space-y-0.5 list-disc pl-4 text-[color:var(--color-muted)]">
          <li>
            Don&apos;t name real artists (e.g. &quot;like Drake&quot;) —
            {platformName} filters those out.
          </li>
          <li>Use descriptors instead: &quot;90s grunge female alto&quot;.</li>
          <li>Always include a BPM number — it locks the tempo.</li>
          <li>
            Order matters: put the most important tag first (genre, then voice, then mood).
          </li>
        </ul>
      </div>
    </div>
  );
}

function GenerateStep({ platform }: { platform: Platform | null }) {
  const isUdio = platform === "udio";
  const url = isUdio ? "https://www.udio.com/create" : "https://suno.com/create";
  const name = isUdio ? "Udio" : "Suno";
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Time to make actual audio. Open <strong>{name}</strong> in a new tab,
        switch to {isUdio ? <strong>Manual Mode</strong> : <strong>Custom Mode</strong>}, and
        paste in the lyrics + style prompt you just copied.
      </p>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-flex items-center gap-1.5"
      >
        <ExternalLink className="h-4 w-4" /> Open {name}
      </a>

      {isUdio ? (
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-2">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Click-by-click in Udio
          </div>
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>
              Sign in (top right). New here?{" "}
              <a
                href="https://www.udio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                Create a free account
              </a>{" "}
              first.
            </li>
            <li>
              On the Create page, find the <strong>Custom</strong> toggle near
              the prompt box and turn it ON. (Sometimes labeled{" "}
              <em>&quot;Manual Mode&quot;</em>.)
            </li>
            <li>
              You&apos;ll see two text boxes:
              <ul className="list-disc pl-5 mt-1 text-xs space-y-0.5 text-[color:var(--color-muted)]">
                <li><strong>Prompt / Tags</strong> — paste your style prompt here</li>
                <li><strong>Lyrics</strong> — paste your full lyrics here (with the [Verse]/[Chorus] tags)</li>
              </ul>
            </li>
            <li>
              Set <strong>Song length</strong> to 32 seconds for a first take
              (faster, costs less). You can extend it later.
            </li>
            <li>
              Click <strong>Create</strong>. Udio gives you 2 takes per
              generation.
            </li>
            <li>
              When ready, click the track → <strong>Extend</strong> to grow it
              from 32s to a full song, picking the section you want next
              (intro, verse, chorus, outro).
            </li>
            <li>
              Once you have a full song you love, click the{" "}
              <strong>⋯ menu</strong> on the track →{" "}
              <strong>Download</strong> → choose <strong>WAV</strong> (paid) or{" "}
              <strong>MP3</strong>.
            </li>
          </ol>
          <a
            href="https://help.udio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-1"
          >
            Stuck? Udio help center <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-2">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Click-by-click in Suno
          </div>
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>
              Sign in (top right). New here?{" "}
              <a
                href="https://suno.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                Create a free account
              </a>{" "}
              — you get 50 credits/day (~10 songs).
            </li>
            <li>
              On the left sidebar, click <strong>Create</strong>.
            </li>
            <li>
              At the top, toggle <strong>Custom</strong> ON. (The default
              &quot;Simple&quot; mode hides the lyrics field.)
            </li>
            <li>
              Three boxes appear:
              <ul className="list-disc pl-5 mt-1 text-xs space-y-0.5 text-[color:var(--color-muted)]">
                <li><strong>Lyrics</strong> — paste your full lyrics here (with the [Verse]/[Chorus] tags)</li>
                <li><strong>Style of Music</strong> — paste your style prompt here</li>
                <li><strong>Title</strong> — give it a working title</li>
              </ul>
            </li>
            <li>
              Make sure <strong>Instrumental</strong> is OFF (so it sings).
            </li>
            <li>
              Click <strong>Create</strong>. Suno gives you 2 takes per
              generation (10 credits each).
            </li>
            <li>
              When done, hover the track → click the <strong>⋯ menu</strong>{" "}
              → <strong>Download</strong> → choose <strong>MP3</strong>{" "}
              (free) or <strong>WAV</strong> (Pro plan).
            </li>
            <li>
              Don&apos;t love the take? Click <strong>Extend</strong> to keep
              the same vibe, or tweak the prompt and re-generate.
            </li>
          </ol>
          <a
            href="https://help.suno.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1 pt-1"
          >
            Stuck? Suno help center <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs space-y-1.5">
        <div className="font-semibold">Quality checklist before you download</div>
        <ul className="space-y-1 text-[color:var(--color-muted)]">
          <li>✓ Vocal sits clearly on top of the mix (not buried)</li>
          <li>✓ Chorus actually hits — feels bigger than the verses</li>
          <li>✓ No weird artifacts in the intro/outro (clipping, glitch noise)</li>
          <li>✓ Length feels right (most singles: 2:30–3:30)</li>
          <li>✓ The lyrics are sung clearly — no obvious slurring on the hook line</li>
        </ul>
        <p className="text-[color:var(--color-muted)] pt-1">
          If 2 of these fail, regenerate before moving on. It&apos;s cheaper
          to re-roll than to fix in mastering.
        </p>
      </div>
    </div>
  );
}

function SaveStep({
  selectedPersona,
}: {
  selectedPersona: Persona | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Suno doesn&apos;t remember your artist&apos;s identity — we do. Save
        each clip back here and ArtistDesigner builds your singer&apos;s
        signature: which styles work, which lyrics they sing best, which
        prompts to reuse.
      </p>
      {selectedPersona ? (
        <CaptureClipForm persona={selectedPersona} />
      ) : (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          Pick or create an artist in step 2 first — clips need to attach to
          a persona so the signature can grow.
        </div>
      )}

      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs space-y-1.5">
        <div className="font-semibold">Where to find each field on Suno</div>
        <ul className="space-y-1 text-[color:var(--color-muted)]">
          <li>
            <strong>Share URL</strong> — click the song → <strong>Share</strong>{" "}
            → copy the link.
          </li>
          <li>
            <strong>Style</strong> — open the song details panel, copy the
            full &quot;Style of Music&quot; tag string (commas and all). This
            is what powers the Signature card.
          </li>
          <li>
            <strong>Lyrics</strong> — same panel, &quot;Lyrics&quot; section,
            copy the full body including [Verse]/[Chorus] tags.
          </li>
          <li>
            <strong>Audio URL</strong> (optional) — right-click the play
            button → <em>Copy audio address</em>. Or just paste the share URL
            and add audio later.
          </li>
        </ul>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        Pin clips you love as <strong>exemplars</strong> — they become the
        in-context examples for any future Forge generation, so the AI starts
        sounding like your artist&apos;s actual hits.
      </p>
    </div>
  );
}

function CaptureClipForm({ persona }: { persona: Persona }) {
  const [title, setTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [pin, setPin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      toast.error("Give it a title");
      return;
    }
    setBusy(true);
    setSavedId(null);
    try {
      const res = await importExternalClip({
        personaId: persona.id,
        source: "suno",
        title: title.trim(),
        externalUrl: externalUrl.trim() || undefined,
        stylePrompt: stylePrompt.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        audioUrl: audioUrl.trim() || undefined,
        pinAsExemplar: pin,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSavedId(res.trackId);
      toast.success("Saved to " + persona.name);
      setTitle("");
      setExternalUrl("");
      setStylePrompt("");
      setLyrics("");
      setAudioUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Save Suno clip → {persona.name}
        </div>
        <a
          href="https://suno.com/me"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
        >
          Open Suno library <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-[color:var(--color-muted)]">Title *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-sm"
          placeholder="Working title for this clip"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-[color:var(--color-muted)]">
          Suno share URL
        </span>
        <input
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-sm font-mono"
          placeholder="https://suno.com/song/..."
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-[color:var(--color-muted)]">
          Style of Music (the comma-list Suno used) — this builds your Signature
        </span>
        <textarea
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-sm font-mono"
          placeholder="dark synthwave, female alto, 110 bpm, anthemic chorus, moody"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-[color:var(--color-muted)]">
          Lyrics (paste the body Suno used or generated)
        </span>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-sm font-mono"
          placeholder={"[Verse 1]\n...\n\n[Chorus]\n..."}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-[color:var(--color-muted)]">
          Audio URL (optional — Suno stream link or your uploaded MP3)
        </span>
        <input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-sm font-mono"
          placeholder="https://..."
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-[color:var(--color-muted)] cursor-pointer">
        <input
          type="checkbox"
          checked={pin}
          onChange={(e) => setPin(e.target.checked)}
          className="accent-[color:var(--color-accent)]"
        />
        Pin as <strong>exemplar</strong> — this style becomes the reference
        for future Forge generations
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !title.trim()}
          className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Music className="h-4 w-4" /> Save to {persona.name}
            </>
          )}
        </button>
        {savedId && (
          <a
            href={`/personas/${persona.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
          >
            View on persona <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ───────────────── master / analyze / distribute ───────────────── */

type DAW = "fl" | "ableton";

function MasterStep() {
  const [daw, setDaw] = useState<DAW>("fl");
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Suno/Udio mixes are usable but not radio-loud. A short mastering chain
        in your DAW gets you to streaming-ready loudness without crushing the
        mix. Pick your DAW:
      </p>
      <div className="flex gap-2">
        <DawTab active={daw === "fl"} onClick={() => setDaw("fl")} label="FL Studio" />
        <DawTab
          active={daw === "ableton"}
          onClick={() => setDaw("ableton")}
          label="Ableton Live"
        />
      </div>

      {daw === "fl" ? <FLSteps /> : <AbletonSteps />}

      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs space-y-1.5">
        <div className="font-semibold">Streaming loudness targets</div>
        <ul className="space-y-1 text-[color:var(--color-muted)]">
          <li>
            <strong>Spotify / YouTube Music:</strong> -14 LUFS integrated
          </li>
          <li>
            <strong>Apple Music / Tidal:</strong> -16 LUFS integrated
          </li>
          <li>
            <strong>True peak:</strong> -1.0 dBTP (never higher)
          </li>
        </ul>
        <div className="text-[color:var(--color-muted)] pt-1">
          Hot tip: don't over-master. -14 LUFS with -1 dBTP is the sweet spot.
          Streaming services <em>turn down</em> louder masters and you lose
          dynamics for nothing.
        </div>
      </div>

      <CopyBlock
        label="Universal mastering chain (any DAW)"
        text={`1. High-pass filter @ 25-30 Hz (12 dB/oct) — kills sub rumble
2. Subtractive EQ — cut 200-400 Hz mud (1-3 dB if needed)
3. Gentle bus compression — 2:1 ratio, slow attack (~30ms),
   auto release, 1-2 dB gain reduction max
4. Tone shaping EQ — small +1-2 dB shelf @ 10-12 kHz for "air"
5. Stereo imager — slight widening on highs only
6. Limiter — ceiling -1.0 dBTP, output gain to taste,
   target -14 LUFS integrated (use a meter)
7. Reference against a commercial track in your genre`}
      />
    </div>
  );
}

function DawTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
        active
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10 text-[color:var(--color-fg)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
      }`}
    >
      {label}
    </button>
  );
}

function FLSteps() {
  return (
    <div className="space-y-3">
      <ol className="text-sm space-y-2 list-decimal pl-5">
        <li>
          <strong>Import:</strong> File → Import → Audio file. Drop the MP3 onto
          the Playlist. Right-click the track → <em>Detect tempo</em> if you
          don't know the BPM.
        </li>
        <li>
          <strong>Route to Master:</strong> Right-click the audio clip → Track
          properties → set Output to Insert 1, then route Insert 1 → Master.
        </li>
        <li>
          <strong>Open the Master mixer channel.</strong> Add these plugins in
          order (top to bottom):
          <ul className="list-disc pl-5 mt-1 text-[color:var(--color-muted)] text-xs space-y-0.5">
            <li>Slot 1: <strong>Fruity Parametric EQ 2</strong> — high-pass at 28 Hz</li>
            <li>Slot 2: <strong>Fruity Multiband Compressor</strong> — preset "Mastering", 1-2 dB GR</li>
            <li>Slot 3: <strong>Fruity Parametric EQ 2</strong> — +1.5 dB shelf @ 10 kHz</li>
            <li>Slot 4: <strong>Fruity Stereo Shaper</strong> (optional widening on highs)</li>
            <li>Slot 5: <strong>Fruity Limiter</strong> — Ceiling -1.0 dB, Gain +3-5 dB to taste</li>
            <li>Slot 6: <strong>Fruity Loudness Meter</strong> (free) — watch LUFS</li>
          </ul>
        </li>
        <li>
          <strong>Tune the limiter</strong> by ear: push Gain on Fruity Limiter
          until the loudest section reads <strong>-14 LUFS integrated</strong>{" "}
          on the meter. Back off if it sounds squashed.
        </li>
        <li>
          <strong>Export:</strong> File → Export → WAV. Settings: 44.1 kHz,
          24-bit, "Save acid info" off. Choose <em>"Render"</em> mode.
        </li>
        <li>
          <strong>A/B test:</strong> drag a Spotify reference track onto a
          second Playlist track and toggle mute. Match perceived loudness
          before judging tone.
        </li>
      </ol>
    </div>
  );
}

function AbletonSteps() {
  return (
    <div className="space-y-3">
      <ol className="text-sm space-y-2 list-decimal pl-5">
        <li>
          <strong>Import:</strong> drag the MP3 into a new Audio track in
          Arrangement view. Right-click the clip → <em>Edit BPM</em> to set
          tempo if needed.
        </li>
        <li>
          <strong>Open the Master track.</strong> Drop these devices in order
          (left to right) on the Master:
          <ul className="list-disc pl-5 mt-1 text-[color:var(--color-muted)] text-xs space-y-0.5">
            <li>1. <strong>EQ Eight</strong> — high-pass @ 30 Hz, slope 24 dB/oct</li>
            <li>2. <strong>Glue Compressor</strong> — Ratio 2:1, Attack 30ms, Release Auto, Threshold for 1-2 dB GR</li>
            <li>3. <strong>EQ Eight</strong> — +1.5 dB shelf @ 10 kHz</li>
            <li>4. <strong>Multiband Dynamics</strong> (optional) — gentle on lows</li>
            <li>5. <strong>Limiter</strong> — Ceiling -1.0 dB, Gain to taste, Lookahead 3 ms</li>
            <li>6. <strong>Utility</strong> + your meter of choice (Youlean Loudness Meter free)</li>
          </ul>
        </li>
        <li>
          <strong>Set loudness:</strong> increase Limiter Gain until Youlean
          shows <strong>-14 LUFS integrated</strong> across the loudest section.
          True peak should stay below -1.0 dBTP.
        </li>
        <li>
          <strong>Reference:</strong> drop a commercial track into a parallel
          audio track set to -14 LUFS via Utility, and toggle mute. Match the
          perceived loudness before judging tone.
        </li>
        <li>
          <strong>Export:</strong> File → Export Audio/Video. Sample rate
          44100, Bit depth 24, Encode PCM. Render Length: Selection or full
          arrangement. Disable Normalize.
        </li>
      </ol>
    </div>
  );
}

type AnalysisResult = {
  overall: number;
  mixBalance: number;
  vocalClarity: number;
  lowEnd: number;
  stereoImage: number;
  masteringReadiness: number;
  distributionReadiness: number;
  summary: string;
  strengths: string[];
  issues: string[];
  masteringActions: string[];
  nextSteps: string[];
};

function AnalyzeStep() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function analyze() {
    if (!audioUrl) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/song-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl, genre, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result as AnalysisResult);
      toast.success("Analysis ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Upload your finished MP3 and our audio model will give you a detailed
        mix &amp; mastering review with concrete next steps. Max 12 MB
        (use MP3, not WAV).
      </p>

      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          1. Upload audio
        </label>
        <FileUpload
          kind="audio"
          onUploaded={(url) => {
            setAudioUrl(url);
            setResult(null);
          }}
          label="Choose MP3"
        />
        {audioUrl && (
          <div className="text-xs text-[color:var(--color-muted)] flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
            Uploaded — ready to analyze
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            2. Genre (optional)
          </label>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. indie pop, drill, lo-fi house"
            className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            3. What you're going for (optional)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. festival-ready, 90s warmth, club banger"
            className="w-full px-3 py-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-sm"
          />
        </div>
      </div>

      <button
        onClick={analyze}
        disabled={!audioUrl || loading}
        className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
          </>
        ) : (
          <>
            <Sliders className="h-4 w-4" /> Analyze my song
          </>
        )}
      </button>

      {errorMsg && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {result && <AnalysisCard result={result} />}
    </div>
  );
}

function AnalysisCard({ result }: { result: AnalysisResult }) {
  const axes: { label: string; value: number }[] = [
    { label: "Mix balance", value: result.mixBalance },
    { label: "Vocal clarity", value: result.vocalClarity },
    { label: "Low end", value: result.lowEnd },
    { label: "Stereo image", value: result.stereoImage },
    { label: "Master readiness", value: result.masteringReadiness },
    { label: "Distribution ready", value: result.distributionReadiness },
  ];
  return (
    <div className="space-y-4 rounded-xl border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/5 p-4">
      <div className="flex items-center gap-3">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
          style={{
            boxShadow:
              "0 0 18px color-mix(in srgb, var(--color-accent) 40%, transparent)",
          }}
        >
          {result.overall.toFixed(1)}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
            Overall score
          </div>
          <div className="text-sm">{result.summary}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {axes.map((a) => (
          <ScoreBar key={a.label} label={a.label} value={a.value} />
        ))}
      </div>

      <AnalysisList title="Strengths" items={result.strengths} tone="ok" />
      <AnalysisList title="Issues to fix" items={result.issues} tone="warn" />
      <AnalysisList
        title="Mastering actions"
        items={result.masteringActions}
        tone="info"
      />
      <AnalysisList title="Next steps" items={result.nextSteps} tone="info" />
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[color:var(--color-muted)]">{label}</span>
        <span className="font-mono">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[color:var(--color-border)] overflow-hidden">
        <div
          className="h-full bg-[color:var(--color-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AnalysisList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn" | "info";
}) {
  if (!items?.length) return null;
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-[color:var(--color-fg)]";
  return (
    <div>
      <div className={`text-xs uppercase tracking-wider mb-1.5 ${color}`}>
        {title}
      </div>
      <ul className="text-sm space-y-1 list-disc pl-5">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function DistributeStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        A distributor pushes your mastered track to Spotify, Apple Music,
        YouTube Music, Tidal, Amazon Music, Deezer, and beyond. You only need{" "}
        <strong>one</strong>. Pick whichever fits your release plan.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        <DistroCard
          name="DistroKid"
          price="$22.99/yr unlimited"
          best="Best for: prolific artists releasing often"
          pros={["Unlimited uploads", "Fastest payouts (~weeks)", "Easy splits"]}
          href="https://distrokid.com"
        />
        <DistroCard
          name="TuneCore"
          price="$14.99 / single (yr 1)"
          best="Best for: high-earning singles, full publishing admin"
          pros={["100% royalties", "Sync licensing tools", "Publishing admin add-on"]}
          href="https://www.tunecore.com"
        />
        <DistroCard
          name="CD Baby"
          price="$9.95 single, $29 album"
          best="Best for: one-time fee, lifetime distribution"
          pros={["Pay once, distribute forever", "YouTube monetization", "Sync licensing"]}
          href="https://cdbaby.com"
        />
      </div>

      <div className="text-xs text-[color:var(--color-muted)]">
        Free options: <strong>Amuse</strong> (free tier with ads), <strong>SoundOn</strong>{" "}
        (free, TikTok-owned), <strong>Spotify for Artists</strong> + <em>Showcase</em>{" "}
        (no separate distributor needed for some regions).
      </div>

      <h3 className="text-sm font-semibold mt-4">
        What you need before uploading
      </h3>
      <ol className="text-sm space-y-2 list-decimal pl-5">
        <li>
          <strong>Mastered audio file:</strong> WAV, 44.1 kHz, 16- or 24-bit.
          MP3 is rejected by most distributors.
        </li>
        <li>
          <strong>Cover art:</strong> 3000×3000 px JPG or PNG (square, RGB, no
          social handles, no website URLs in the image).
        </li>
        <li>
          <strong>Track metadata:</strong> title, primary artist (your artist
          name), featured artists, songwriter(s), producer, ISRC (auto-generated
          if you don't have one).
        </li>
        <li>
          <strong>Genre + sub-genre:</strong> pick the closest match — this
          drives playlist eligibility.
        </li>
        <li>
          <strong>Lyrics:</strong> Spotify and Apple Music both accept lyrics
          via the distributor or Musixmatch. Submit them.
        </li>
        <li>
          <strong>Release date:</strong> set it <strong>3-4 weeks out</strong>{" "}
          to qualify for Spotify editorial pitching.
        </li>
        <li>
          <strong>UPC + ISRC:</strong> distributors generate these for free.
          Don't pay for them separately.
        </li>
      </ol>

      <h3 className="text-sm font-semibold mt-4">Release-day checklist</h3>
      <ul className="text-sm space-y-1.5 list-disc pl-5">
        <li>
          Pitch to Spotify editorial via <strong>Spotify for Artists</strong>{" "}
          (must be done <strong>at least 7 days before</strong> release date).
        </li>
        <li>Set up Apple Music for Artists and YouTube Official Artist Channel.</li>
        <li>Pre-save link via Hypeddit, Linkfire, or Show.co.</li>
        <li>Drop a teaser clip on TikTok / Reels 2 weeks out.</li>
        <li>
          Post the song on the artist's <Link href="/personas" className="text-[color:var(--color-accent)] hover:underline">public profile</Link>{" "}
          here.
        </li>
        <li>
          Mark the release in ArtistDesigner — open the artist → Releases tab →
          add release date, distributor, UPC.
        </li>
      </ul>

      <CopyBlock
        label="Track metadata template"
        text={`Title: 
Primary artist: 
Featured artists: 
Songwriter(s) (legal names): 
Producer(s): 
Genre / sub-genre: 
Language: 
Explicit?: yes / no / clean
Release date: 
ISRC: (let distributor generate)
UPC: (let distributor generate)
Lyrics: (paste here)
Spotify pitch (~500 chars): describe mood, intent, story, who you've toured/collab'd with`}
      />

      <button
        onClick={onFinish}
        className="btn-primary inline-flex items-center gap-1.5 mt-2"
      >
        <Send className="h-4 w-4" /> I'm ready to release
      </button>
    </div>
  );
}

function DistroCard({
  name,
  price,
  best,
  pros,
  href,
}: {
  name: string;
  price: string;
  best: string;
  pros: string[];
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card hover:border-[color:var(--color-accent)] transition-colors block"
    >
      <div className="font-semibold mb-0.5">{name}</div>
      <div className="text-xs text-[color:var(--color-accent)] mb-1">{price}</div>
      <div className="text-xs text-[color:var(--color-muted)] mb-2">{best}</div>
      <ul className="text-xs space-y-0.5">
        {pros.map((p) => (
          <li key={p} className="flex gap-1.5">
            <span className="text-[color:var(--color-accent)]">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-xs text-[color:var(--color-muted)] inline-flex items-center gap-1">
        Visit <ExternalLink className="h-3 w-3" />
      </div>
    </a>
  );
}

function CopyBlock({
  label,
  text,
}: {
  label: string;
  text: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text manually.");
    }
  }
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[color:var(--color-border)]">
        <span className="text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          {label}
        </span>
        <button
          onClick={copy}
          className="text-xs inline-flex items-center gap-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="px-3 py-2.5 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-auto">
        {text}
      </pre>
    </div>
  );
}
