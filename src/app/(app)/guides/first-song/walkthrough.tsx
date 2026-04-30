"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
import {
  dismissOnboarding,
  resetOnboarding,
  setOnboardingPlatform,
  setOnboardingStep,
} from "./actions";

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
      {selectedPersona && (
        <a
          href={`/personas/${selectedPersona.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost inline-flex items-center gap-1.5 text-sm"
        >
          Open {selectedPersona.name} in new tab{" "}
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
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
      {selectedPersona && (
        <a
          href={`/personas/${selectedPersona.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost inline-flex items-center gap-1.5 text-sm"
        >
          Build prompt on {selectedPersona.name}{" "}
          <ExternalLink className="h-4 w-4" />
        </a>
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
  selectedPersona,
}: {
  selectedPersona: Persona | null;
}) {
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
        {selectedPersona ? (
          <a
            href={`/personas/${selectedPersona.id}/tracks`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Music className="h-4 w-4" /> Add track to {selectedPersona.name}{" "}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-xs text-[color:var(--color-muted)]">
            No artist selected — go back to step 2.
          </span>
        )}
        <a
          href="/library/tracks?new=manual"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost inline-flex items-center gap-1.5"
        >
          Add to any artist <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        Once your audio is uploaded, hit Next to learn how to master it.
      </p>
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
