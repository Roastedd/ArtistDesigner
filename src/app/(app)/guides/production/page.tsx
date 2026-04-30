import { Wand2, ExternalLink, ClipboardCopy } from "lucide-react";

const SUNO_SETTINGS = [
  { label: "Mode", value: "Custom" },
  { label: "Instrumental", value: "Off (unless no lyrics)" },
  { label: "Song Duration", value: "Auto or 3–4 min" },
  { label: "Version", value: "v4 (latest)" },
];

const STEPS = [
  {
    n: 1,
    body: (
      <>
        Open a track in ArtistDesigner and click{" "}
        <Pill>Copy</Pill> on the Production Prompt.
      </>
    ),
  },
  {
    n: 2,
    body: (
      <>
        In Suno, select <Pill>Custom</Pill> mode and paste into the{" "}
        <Pill>Style of Music</Pill> field.
      </>
    ),
  },
  {
    n: 3,
    body: (
      <>
        Copy and paste the <Pill>Lyrics</Pill> into Suno&apos;s lyrics field.
      </>
    ),
  },
  {
    n: 4,
    body: <>Click <Pill>Create</Pill> and listen to the generated versions.</>,
  },
];

const PROMPT_TEMPLATE = `[Genre] [Mood/Vibe], [BPM] BPM, [Key]
[Instrument emphasis], [Vocal style]
[Additional descriptors from production prompt]`;

export default function ProductionGuidesPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-[color:var(--color-accent)]" />
          Production Guides
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Get the most out of your AI-generated prompts with Suno and Udio.
        </p>
      </header>

      {/* Suno workflow */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Suno Workflow</h2>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Recommended settings and a step-by-step copy/paste flow.
          </p>
        </div>

        <div className="card">
          <div className="font-semibold mb-3 text-sm">Recommended Settings</div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {SUNO_SETTINGS.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[color:var(--color-border)]/50 last:border-0"
              >
                <dt className="text-[color:var(--color-muted)]">{s.label}</dt>
                <dd className="font-medium text-right">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card">
          <div className="font-semibold mb-3 text-sm">
            How to use ArtistDesigner prompts
          </div>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3 text-sm">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-accent-fg)",
                  }}
                >
                  {s.n}
                </span>
                <span className="leading-relaxed pt-0.5">{s.body}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm flex items-center gap-2">
              <ClipboardCopy className="h-4 w-4 text-[color:var(--color-accent)]" />
              Prompt Template
            </div>
          </div>
          <pre className="text-xs leading-relaxed bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
{PROMPT_TEMPLATE}
          </pre>
          <p className="text-xs text-[color:var(--color-muted)] mt-3 leading-relaxed">
            Suno works best with concise style descriptions. If your production
            prompt is very long, focus on the genre, mood, BPM, and key. Add 2–3
            key instrument or vocal descriptors.
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            Use metatags in lyrics for structure: <Pill>[Verse]</Pill>{" "}
            <Pill>[Chorus]</Pill> <Pill>[Bridge]</Pill> <Pill>[Outro]</Pill>
          </p>
        </div>

        <a
          href="https://suno.com"
          target="_blank"
          rel="noreferrer"
          className="btn inline-flex items-center gap-2"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-fg)",
          }}
        >
          Open Suno <ExternalLink className="h-4 w-4" />
        </a>
      </section>

      {/* Udio */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Udio Tips</h2>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            How to adapt the same production prompt for Udio.
          </p>
        </div>
        <div className="card text-sm space-y-2 leading-relaxed">
          <p>
            Udio rewards <strong>tag-style</strong> prompts. Strip articles and
            join with commas: e.g.{" "}
            <code className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-bg)] border border-[color:var(--color-border)]">
              dark trap, 140 bpm, F minor, 808 sub, airy female vocal
            </code>
            .
          </p>
          <p>
            Use <Pill>[Chorus]</Pill> and <Pill>[Verse]</Pill> tags inside the
            lyrics — Udio respects them. Avoid stage directions (Udio sometimes
            sings them).
          </p>
          <p>
            Generate two passes: one short clip to lock the vibe, then{" "}
            <em>extend</em> with the full lyric body.
          </p>
        </div>
        <a
          href="https://udio.com"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost btn inline-flex items-center gap-2"
        >
          Open Udio <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)]/90 align-middle">
      {children}
    </span>
  );
}
