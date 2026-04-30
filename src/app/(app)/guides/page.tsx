import Link from "next/link";
import { BookOpen, Sparkles, Mic2, Disc3 } from "lucide-react";

const GUIDES = [
  {
    href: "/guides/how-ai-works",
    title: "How AI Works",
    desc: "What the brainstorm engine does behind the scenes.",
    icon: Sparkles,
  },
  {
    href: "/personas/new",
    title: "Create your first artist",
    desc: "Vibe → name → DNA in under a minute.",
    icon: Mic2,
  },
  {
    href: "/library/albums",
    title: "Build a release-ready album",
    desc: "Sequence tracks, set a release date, ship.",
    icon: Disc3,
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[color:var(--color-accent)]" />
          Guides
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          Short reads to get the most out of the studio.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {GUIDES.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.href}
              href={g.href}
              className="card hover:border-[color:var(--color-accent)] transition-colors flex gap-3"
            >
              <Icon className="h-5 w-5 text-[color:var(--color-accent)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{g.title}</div>
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
