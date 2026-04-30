"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Music,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  dismissOnboarding,
  resetOnboarding,
  setOnboardingPlatform,
  setOnboardingStep,
} from "./actions";

type Persona = { id: string; name: string };
type Platform = "suno" | "udio";

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  "Pick your platform",
  "Pick (or create) an artist",
  "Write your lyrics",
  "Build your style prompt",
  "Generate on the platform",
  "Save it back here",
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
  const [pending, start] = useTransition();
  const completed = initialStep >= TOTAL_STEPS;

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
            A 6-step walkthrough for Suno or Udio. Your progress saves
            automatically.
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
      <ol className="grid grid-cols-6 gap-1.5">
        {STEP_TITLES.map((t, i) => {
          const reached = i <= Math.max(initialStep, step);
          const current = i === step;
          return (
            <li key={t}>
              <button
                onClick={() => go(i)}
                title={`${i + 1}. ${t}`}
                className={`w-full h-1.5 rounded-full transition-colors ${
                  current
                    ? "bg-[color:var(--color-accent)]"
                    : reached
                      ? "bg-[color:var(--color-accent)]/40"
                      : "bg-[color:var(--color-border)]"
                }`}
                aria-label={`Step ${i + 1}: ${t}`}
              />
            </li>
          );
        })}
      </ol>

      {/* Step body */}
      <section className="card space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--color-muted)]">
          Step {step + 1} of {TOTAL_STEPS}
        </div>
        <h2 className="text-xl font-semibold">{STEP_TITLES[step]}</h2>

        {step === 0 && (
          <PlatformPicker selected={platform} onSelect={pickPlatform} />
        )}
        {step === 1 && <ArtistStep personas={personas} />}
        {step === 2 && <LyricsStep personas={personas} platform={platform} />}
        {step === 3 && <StyleStep personas={personas} platform={platform} />}
        {step === 4 && <GenerateStep platform={platform} />}
        {step === 5 && <SaveStep personas={personas} onFinish={finish} />}
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
            disabled={pending || (step === 0 && !platform)}
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
            <Check className="h-4 w-4" /> I made my song
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

function PlatformPicker({
  selected,
  onSelect,
}: {
  selected: Platform | null;
  onSelect: (p: Platform) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Both platforms are excellent. Pick whichever you have credits on — you
        can always switch later. ArtistDesigner gives you the lyrics and style
        prompt; the platform turns them into audio.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <PlatformCard
          name="suno"
          title="Suno"
          tagline="Best for: full songs, polished mixes, sing-along hooks"
          bullets={[
            "Strong vocal clarity & studio polish",
            "Great at pop, R&B, hip-hop, country",
            "Custom Mode supports section tags ([Verse], [Chorus])",
          ]}
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
          ]}
          selected={selected === "udio"}
          onSelect={() => onSelect("udio")}
        />
      </div>
      {!selected && (
        <p className="text-xs text-[color:var(--color-muted)]">
          Pick one to continue.
        </p>
      )}
    </div>
  );
}

function PlatformCard({
  title,
  tagline,
  bullets,
  selected,
  onSelect,
}: {
  name: Platform;
  title: string;
  tagline: string;
  bullets: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border p-4 transition-colors ${
        selected
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5"
          : "border-[color:var(--color-border)] hover:border-[color:var(--color-accent)]/50"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold">{title}</span>
        {selected && (
          <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
        )}
      </div>
      <p className="text-xs text-[color:var(--color-muted)] mb-3">{tagline}</p>
      <ul className="text-xs space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex gap-1.5">
            <span className="text-[color:var(--color-accent)]">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function ArtistStep({ personas }: { personas: Persona[] }) {
  if (personas.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[color:var(--color-muted)]">
          Every song needs an artist. Your artist's DNA — genre, vocals, era,
          mood — drives the style prompt and keeps releases consistent.
        </p>
        <div className="card border-dashed">
          <div className="text-sm mb-3">You don't have an artist yet.</div>
          <Link
            href="/personas/new"
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" /> Generate one in 60 seconds
          </Link>
        </div>
        <p className="text-xs text-[color:var(--color-muted)]">
          Come back to this step when you're done — your progress is saved.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--color-muted)]">
        Pick the artist this song belongs to. Open their detail page to grab
        the lyrics and style prompt in the next steps.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {personas.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            href={`/personas/${p.id}`}
            className="card hover:border-[color:var(--color-accent)] transition-colors flex items-center justify-between text-sm"
          >
            <span className="font-medium truncate">{p.name}</span>
            <ArrowRight className="h-4 w-4 text-[color:var(--color-muted)]" />
          </Link>
        ))}
      </div>
      <Link
        href="/personas/new"
        className="text-xs text-[color:var(--color-accent)] hover:opacity-80 inline-flex items-center gap-1"
      >
        <Sparkles className="h-3.5 w-3.5" /> or generate a new one
      </Link>
    </div>
  );
}

function LyricsStep({
  personas,
  platform,
}: {
  personas: Persona[];
  platform: Platform | null;
}) {
  const exampleLyrics = `[Verse 1]
City lights they fade to gold
Every story I was told
Came alive the day we met
On the rooftop, no regret

[Pre-Chorus]
And the night, it pulls us under
Hearts on fire, soft like thunder

[Chorus]
We were made to run wild
Made to burn for a while
Every heartbeat a song
We've been singing all along

[Verse 2]
Faded jeans, your mother's ring
Promises that summers bring
Maps we drew on motel walls
Names we whispered down the halls

[Chorus]
We were made to run wild
Made to burn for a while
Every heartbeat a song
We've been singing all along

[Bridge]
If the world forgets our name
We'll burn it down again

[Chorus]
We were made to run wild
Made to burn for a while
Every heartbeat a song
We've been singing all along

[Outro]
We've been singing all along...`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        {platform === "udio"
          ? "Udio respects section tags too. Keep verses tight (4–8 lines) and put the title-line in the chorus."
          : "Suno's Custom Mode reads section tags like [Verse], [Chorus], [Bridge]. Keep total lyrics under ~3000 characters."}
      </p>
      <ul className="text-sm space-y-1.5 list-disc pl-5">
        <li>
          Open your artist and use{" "}
          <strong>Lyric Seeder</strong> or <strong>Prompt Forge</strong> to
          draft lyrics that fit the artist's voice.
        </li>
        <li>
          Structure: <code>[Verse 1] / [Pre-Chorus] / [Chorus] / [Verse 2] / [Chorus] / [Bridge] / [Chorus] / [Outro]</code>
        </li>
        <li>Repeat the chorus exactly — it teaches the model the hook.</li>
        <li>One thought per line. Avoid stage directions in body text.</li>
      </ul>
      <CopyBlock
        label="Example lyric structure"
        text={exampleLyrics}
        lang="text"
      />
      {personas.length > 0 && (
        <Link
          href={`/personas/${personas[0].id}`}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm"
        >
          Open artist <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function StyleStep({
  personas,
  platform,
}: {
  personas: Persona[];
  platform: Platform | null;
}) {
  const example =
    platform === "udio"
      ? "moody synthwave, female alto vocals, analog drum machine, reverb-soaked guitar, 90 BPM, late-night drive, vintage 1985"
      : "indie pop rock, male tenor lead, jangly guitars, punchy drums, warm analog synths, 110 BPM, anthemic chorus, festival-ready";
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        The style prompt tells the model <em>how</em> the song should sound.
        Aim for ~6–12 short comma-separated tags. ArtistDesigner builds these
        for you on each artist page.
      </p>
      <ol className="text-sm space-y-1.5 list-decimal pl-5">
        <li>Genre + sub-genre (e.g. "indie pop rock")</li>
        <li>Vocal type (gender, range, delivery)</li>
        <li>Key instruments (guitar, synth, drums)</li>
        <li>Mood / energy (anthemic, melancholic)</li>
        <li>Tempo in BPM</li>
        <li>Era / production reference (1985, lo-fi, modern radio)</li>
      </ol>
      <CopyBlock
        label={`Example ${platform === "udio" ? "Udio" : "Suno"} style prompt`}
        text={example}
        lang="text"
      />
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-muted)]">
        <strong className="text-[color:var(--color-fg)]">Pro tip:</strong>{" "}
        avoid artist names. Use descriptors instead ("90s grunge female alto"
        vs. naming a real artist) to dodge filters and stay original.
      </div>
      {personas.length > 0 && (
        <Link
          href={`/personas/${personas[0].id}`}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm"
        >
          Build prompt on artist <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function GenerateStep({ platform }: { platform: Platform | null }) {
  const url =
    platform === "udio" ? "https://www.udio.com/create" : "https://suno.com/create";
  const name = platform === "udio" ? "Udio" : "Suno";
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Time to make audio. Open {name} in a new tab, switch to{" "}
        <strong>Custom Mode</strong>, and paste in what you have.
      </p>
      <ol className="text-sm space-y-2 list-decimal pl-5">
        <li>
          Click below to open {name}.{" "}
          <em className="text-[color:var(--color-muted)]">
            (Sign in if needed.)
          </em>
        </li>
        <li>
          Toggle <strong>Custom Mode</strong> (Suno) or{" "}
          <strong>Manual Mode</strong> (Udio).
        </li>
        <li>
          Paste your <strong>lyrics</strong> with section tags into the lyrics
          box.
        </li>
        <li>
          Paste your <strong>style prompt</strong> into the style/description
          box.
        </li>
        <li>Give it a working title and hit generate.</li>
        <li>
          Generate <strong>2–4 takes</strong>. Listen to all, pick the best,
          then optionally <strong>Extend</strong> or <strong>Remaster</strong>.
        </li>
      </ol>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-flex items-center gap-1.5"
      >
        <ExternalLink className="h-4 w-4" /> Open {name}
      </a>
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs space-y-1.5">
        <div className="font-semibold">Quality checklist before downloading</div>
        <ul className="space-y-1 text-[color:var(--color-muted)]">
          <li>✓ Vocal sits clearly on top of the mix</li>
          <li>✓ Chorus actually hits — bigger than verses</li>
          <li>✓ No weird artifacts in the intro/outro</li>
          <li>✓ Length feels right (most singles: 2:30–3:30)</li>
        </ul>
      </div>
    </div>
  );
}

function SaveStep({
  personas,
  onFinish,
}: {
  personas: Persona[];
  onFinish: () => void;
}) {
  const first = personas[0];
  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--color-muted)]">
        Bring your finished take back into ArtistDesigner so it lives with the
        artist, can join an album, and ships with a release checklist.
      </p>
      <ol className="text-sm space-y-2 list-decimal pl-5">
        <li>
          On the platform, <strong>download the MP3</strong> (and the WAV if
          you have a paid plan).
        </li>
        <li>
          Also grab the <strong>cover art</strong> the platform generated, or
          upload your own.
        </li>
        <li>
          In ArtistDesigner, open the artist and add a track — paste the
          lyrics, attach the audio file, and set status to <em>Mixed</em> or{" "}
          <em>Mastered</em>.
        </li>
        <li>
          Group it into an album when you're ready, then mark the artist
          public to share.
        </li>
      </ol>
      <div className="flex flex-wrap gap-2">
        {first && (
          <Link
            href={`/personas/${first.id}/tracks`}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Music className="h-4 w-4" /> Add track to {first.name}
          </Link>
        )}
        <Link
          href="/library/tracks?new=manual"
          className="btn-ghost inline-flex items-center gap-1.5"
        >
          Add to any artist
        </Link>
      </div>
      <button
        onClick={onFinish}
        className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] inline-flex items-center gap-1.5"
      >
        <Check className="h-3.5 w-3.5" /> Mark walkthrough complete
      </button>
    </div>
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
