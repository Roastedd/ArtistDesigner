import Link from "next/link";
import {
  Lightbulb,
  Mic2,
  Radio,
  Eye,
  Music2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Mic2,
    title: "Natural Human Sound",
    body: "Lyrics use fragments, slang (ain't, gonna, 'cause), and vocal ad-libs (oh, mmm) — the way real people actually sing.",
  },
  {
    icon: Radio,
    title: "Radio-Ready Structure",
    body: "Every song follows Billboard-style frameworks with hooks that stick, conversational verses, and singable choruses.",
  },
  {
    icon: Eye,
    title: "Show, Don't Tell",
    body: "No emotional summaries or formal prose. Concrete details, vivid imagery, and intentional imperfections like slant rhymes.",
  },
  {
    icon: Music2,
    title: "Rhythmic Singability",
    body: "Syllable counts match melodic phrases. Stressed syllables land on downbeats. Every line is built to be sung, not read.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-AI Detection",
    body: "Avoids chronological narration, perfect rhyme schemes, and overly poetic language — the hallmarks of generic AI lyrics.",
  },
];

const COMPARISONS = [
  {
    bad: '"I feel so sad and lonely tonight"',
    good: '"Empty glass on the counter, 3 AM again / Your side of the bed still smells like you"',
  },
  {
    bad: '"You broke my heart and I\'m in pain"',
    good: '"You left your jacket but took the best of me / Now I\'m wearin\' it just to feel somethin\'"',
  },
  {
    bad: '"I want to dance and have a good time"',
    good: '"Bass drop hit, forget the rest / Two-step, moonlight, yeah we blessed"',
  },
];

const AVOIDS = [
  'No chronological storytelling ("First I woke up, then I went to...")',
  'No emotional summaries ("I\'m feeling heartbroken and sad")',
  "No formal prose or academic language",
  "No perfectly rhyming couplets throughout",
  "No generic inspirational platitudes",
];

export default function HowAIWorksPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Hero */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-7 w-7 text-[color:var(--color-accent)]" />
          How Our AI Works
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          The technology behind ArtistDesigner&apos;s radio-ready,
          natural-sounding lyrics.
        </p>
      </header>

      {/* Engine intro */}
      <section
        className="rounded-2xl border border-[color:var(--color-border)] p-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 14%, transparent) 0%, color-mix(in srgb, var(--color-accent) 4%, var(--color-bg-elev)) 60%, var(--color-bg-elev) 100%)",
        }}
      >
        <h2 className="text-xl font-bold">Radio-Ready Lyric Engine</h2>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Trained to write lyrics that sound human — not like AI.
        </p>
        <p className="text-sm leading-relaxed mt-4">
          ArtistDesigner uses a specialized prompt framework built on
          professional songwriting principles. Unlike generic AI text generators,
          our engine prioritizes conversational authenticity, rhythmic
          singability, and emotional specificity — the qualities that separate
          a hit record from a homework assignment.
        </p>
      </section>

      {/* Feature grid */}
      <section className="grid md:grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="card flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-[color:var(--color-bg)] border border-[color:var(--color-border)] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
              </div>
              <div>
                <div className="font-semibold text-sm">{f.title}</div>
                <div className="text-sm text-[color:var(--color-muted)] mt-1 leading-relaxed">
                  {f.body}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Pull quote */}
      <blockquote className="border-l-4 border-[color:var(--color-accent)] pl-4 py-2 text-sm italic text-[color:var(--color-fg)]/90">
        &ldquo;Every lyric line is engineered to be sung, not read. Syllable
        counts match melodic phrases, stressed syllables land on downbeats, and
        imperfections like slant rhymes and dropped words make it feel
        real.&rdquo;
      </blockquote>

      {/* Comparison */}
      <section>
        <h2 className="text-xl font-bold">Generic AI vs. ArtistDesigner</h2>
        <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
          See the difference our lyric engine makes.
        </p>
        <div className="space-y-3">
          {COMPARISONS.map((c, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-red-400/80 mb-1">
                  Generic AI
                </div>
                <div className="text-sm text-[color:var(--color-fg)]/80">
                  {c.bad}
                </div>
              </div>
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--color-accent) 40%, transparent)",
                  background:
                    "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                }}
              >
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[color:var(--color-accent)] mb-1">
                  ArtistDesigner
                </div>
                <div className="text-sm">{c.good}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avoids */}
      <section className="card">
        <h2 className="font-semibold">What our engine avoids</h2>
        <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-3">
          Common AI writing patterns that make lyrics sound robotic:
        </p>
        <ul className="space-y-1.5 text-sm">
          {AVOIDS.map((a) => (
            <li
              key={a}
              className="flex items-start gap-2 text-[color:var(--color-fg)]/85"
            >
              <span className="mt-1 h-1 w-1 rounded-full bg-[color:var(--color-accent)] shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section
        className="rounded-2xl border border-[color:var(--color-border)] p-6 text-center"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 12%, transparent) 0%, var(--color-bg-elev) 80%)",
        }}
      >
        <h3 className="font-semibold">Ready to hear the difference?</h3>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Generate your first artist and album to experience radio-ready AI
          lyrics.
        </p>
        <Link
          href="/personas/new"
          className="btn mt-4 inline-flex items-center gap-2"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-fg)",
          }}
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
