import Link from "next/link";
import {
  BookOpen,
  Lightbulb,
  Wand2,
  Mic2,
  Disc3,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    href: "/guides/how-ai-works",
    title: "How Our AI Works",
    desc: "The technology behind ArtistDesigner's radio-ready, natural-sounding lyrics.",
    icon: Lightbulb,
    accent: true,
  },
  {
    href: "/guides/production",
    title: "Production Guides",
    desc: "Get the most out of your AI-generated prompts with Suno and Udio.",
    icon: Wand2,
    accent: true,
  },
  {
    href: "/personas/new",
    title: "Create your first artist",
    desc: "Vibe → name → DNA in under a minute. Brainstorm with AI or fill in manually.",
    icon: Mic2,
  },
  {
    href: "/library/albums",
    title: "Build a release-ready album",
    desc: "Sequence tracks, set release dates, and ship with a checklist.",
    icon: Disc3,
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-[color:var(--color-accent)]" />
          Guides
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Short reads to get the most out of the studio.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {SECTIONS.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.href}
              href={g.href}
              className="card hover:border-[color:var(--color-accent)] transition-colors flex gap-4 group"
            >
              <div
                className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center ${
                  g.accent
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
                    : "bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
                }`}
                style={
                  g.accent
                    ? {
                        boxShadow:
                          "0 0 16px color-mix(in srgb, var(--color-accent) 30%, transparent)",
                      }
                    : undefined
                }
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-1">
                  {g.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[color:var(--color-accent)]" />
                </div>
                <div className="text-sm text-[color:var(--color-muted)] mt-1">
                  {g.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
