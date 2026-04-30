import Link from "next/link";
import Image from "next/image";
import { and, eq, isNull, sql, inArray, desc } from "drizzle-orm";
import {
  Sparkles,
  UserPlus,
  Disc3,
  Plus,
  Music2,
  Mic2,
  Globe2,
  Rocket,
  Check,
  Circle,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { db } from "@/db";
import { personas, albums, tracks, users } from "@/db/schema";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProducerNameCard } from "./producer-name-card";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  const list = await db
    .select()
    .from(personas)
    .where(and(eq(personas.userId, userId), isNull(personas.deletedAt)));

  const personaIds = list.map((p) => p.id);

  let totalAlbums = 0;
  let totalTracks = 0;
  let publicArtists = 0;
  let recent: { id: string; name: string; cover: string | null }[] = [];

  if (personaIds.length > 0) {
    const [aAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(albums)
      .where(inArray(albums.personaId, personaIds));
    totalAlbums = aAgg?.count ?? 0;

    const [tAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tracks)
      .where(inArray(tracks.personaId, personaIds));
    totalTracks = tAgg?.count ?? 0;

    publicArtists = list.filter((p) => p.isPublic).length;

    const coverRows = await db
      .selectDistinctOn([albums.personaId], {
        personaId: albums.personaId,
        coverUrl: albums.coverUrl,
      })
      .from(albums)
      .orderBy(albums.personaId, desc(albums.createdAt));
    const coverMap = new Map(coverRows.map((r) => [r.personaId, r.coverUrl]));

    recent = list.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      cover: coverMap.get(p.id) ?? null,
    }));
  }

  const hasArtist = list.length > 0;
  const hasAlbum = totalAlbums > 0;
  const hasPublic = publicArtists > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Your AI record label at a glance.
        </p>
      </div>

      {/* Getting Started */}
      <FirstSongBanner
        step={user?.onboardingStep ?? 0}
        dismissed={user?.onboardingDismissed ?? false}
      />
      <GettingStarted
        hasArtist={hasArtist}
        hasAlbum={hasAlbum}
        hasPublic={hasPublic}
      />

      {/* Producer name */}
      <ProducerNameCard
        initialName={user?.producerName ?? null}
        email={session.user.email ?? ""}
        profileSlug={list.find((p) => p.isPublic)?.slug ?? null}
      />

      {/* Quick action grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          href="/personas/new"
          icon={Sparkles}
          title="Generate Artist"
          desc="AI-generate a complete Artist DNA"
          tone="accent"
        />
        <ActionCard
          href="/library/albums?new=ai"
          icon={Sparkles}
          title="Generate Album"
          desc="AI-generate a cohesive album"
          tone="accent"
        />
        <ActionCard
          href="/personas/new?mode=manual"
          icon={UserPlus}
          title="Add Artist"
          desc="Manually add your own artist"
        />
        <ActionCard
          href="/library/albums?new=manual"
          icon={Disc3}
          title="Build Album"
          desc="Assemble your own tracks"
        />
        <ActionCard
          href="/library/tracks?new=ai"
          icon={Music2}
          title="Generate Track"
          desc="One-off AI track with full prompt"
          tone="accent"
        />
        <ActionCard
          href="/library/tracks?new=manual"
          icon={Plus}
          title="Add Track"
          desc="Add a track from your own files"
        />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Mic2} label="Artists" value={list.length} />
        <Stat icon={Disc3} label="Albums" value={totalAlbums} />
        <Stat icon={Music2} label="Tracks" value={totalTracks} />
        <Stat icon={Globe2} label="Public" value={publicArtists} />
      </section>

      {/* Recent artists */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Artists</h2>
            <Link
              href="/personas"
              className="text-sm text-[color:var(--color-accent)] hover:opacity-80 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/personas/${p.id}`}
                className="group rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] overflow-hidden hover:border-[color:var(--color-accent)] transition-colors"
              >
                <div className="aspect-square bg-[color:var(--color-bg)] relative">
                  {p.cover ? (
                    <Image
                      src={p.cover}
                      alt={p.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-mono text-[color:var(--color-muted)]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 text-sm font-medium truncate">
                  {p.name}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GettingStarted({
  hasArtist,
  hasAlbum,
  hasPublic,
}: {
  hasArtist: boolean;
  hasAlbum: boolean;
  hasPublic: boolean;
}) {
  const items: {
    done: boolean;
    title: string;
    desc: string;
    href: string;
    cta: string;
  }[] = [
    {
      done: hasArtist,
      title: "Generate an Artist",
      desc: "Define your sonic + visual DNA in under a minute",
      href: "/personas/new",
      cta: "Start",
    },
    {
      done: hasAlbum,
      title: "Build an Album",
      desc: "Sequence tracks into a cohesive release",
      href: "/library/albums?new=ai",
      cta: "Start",
    },
    {
      done: hasPublic,
      title: "Share on Explore",
      desc: "Toggle an artist to Public to publish a profile",
      href: "/personas",
      cta: "Open",
    },
  ];

  return (
    <section
      className="rounded-2xl border border-[color:var(--color-border)] p-5"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 14%, transparent) 0%, color-mix(in srgb, var(--color-accent) 4%, var(--color-bg-elev)) 60%, var(--color-bg-elev) 100%)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-[color:var(--color-accent)]" />
        <h2 className="font-semibold">Getting Started</h2>
      </div>
      <ul className="divide-y divide-[color:var(--color-border)]/60">
        {items.map((it) => (
          <li
            key={it.title}
            className="py-2.5 flex items-center gap-3"
          >
            {it.done ? (
              <Check className="h-4 w-4 text-[color:var(--color-accent)] shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-[color:var(--color-muted)] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  it.done ? "text-[color:var(--color-muted)] line-through" : ""
                }`}
              >
                {it.title}
              </div>
              <div className="text-xs text-[color:var(--color-muted)]">
                {it.desc}
              </div>
            </div>
            <Link
              href={it.href}
              className="btn-ghost btn text-xs px-3 py-1"
            >
              {it.done ? "Open" : it.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const FIRST_SONG_TOTAL = 9;

function FirstSongBanner({
  step,
  dismissed,
}: {
  step: number;
  dismissed: boolean;
}) {
  if (dismissed) return null;
  const completed = step >= FIRST_SONG_TOTAL;
  if (completed) return null;
  const started = step > 0;
  const pct = Math.min(100, Math.round((step / FIRST_SONG_TOTAL) * 100));
  return (
    <Link
      href="/guides/first-song"
      className="block rounded-2xl border border-[color:var(--color-accent)]/40 p-5 hover:border-[color:var(--color-accent)] transition-colors group"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 20%, transparent) 0%, color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-elev)) 60%, var(--color-bg-elev) 100%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl shrink-0 flex items-center justify-center bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
          style={{
            boxShadow:
              "0 0 18px color-mix(in srgb, var(--color-accent) 35%, transparent)",
          }}
        >
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold">
              {started ? "Pick up where you left off" : "New here? Make your first song"}
            </div>
            <span className="text-xs text-[color:var(--color-muted)]">
              {started
                ? `Step ${Math.min(step + 1, FIRST_SONG_TOTAL)} of ${FIRST_SONG_TOTAL}`
                : `${FIRST_SONG_TOTAL} short steps`}
            </span>
          </div>
          <div className="text-sm text-[color:var(--color-muted)] mt-1">
            A guided walkthrough for Suno or Udio. Lyrics, style prompts, and
            saving the finished track — your progress saves automatically.
          </div>
          {started && (
            <div className="mt-3 h-1.5 rounded-full bg-[color:var(--color-border)] overflow-hidden">
              <div
                className="h-full bg-[color:var(--color-accent)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-1 text-sm text-[color:var(--color-accent)] group-hover:opacity-80">
            {started ? "Continue" : "Start"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  badge,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  badge?: string;
  tone?: "accent";
}) {
  return (
    <Link
      href={href}
      className="card flex items-start gap-3 hover:border-[color:var(--color-accent)] transition-colors"
    >
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
          tone === "accent"
            ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
            : "bg-[color:var(--color-bg)] text-[color:var(--color-fg)]"
        }`}
        style={
          tone === "accent"
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
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[color:var(--color-bg)] border border-[color:var(--color-border)] text-[color:var(--color-muted)]">
              {badge}
            </span>
          )}
        </div>
        <div className="text-sm text-[color:var(--color-muted)] mt-0.5">
          {desc}
        </div>
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-[color:var(--color-bg)] flex items-center justify-center text-[color:var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-[color:var(--color-muted)] mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}
