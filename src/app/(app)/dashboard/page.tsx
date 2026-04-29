import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { personas, albums, tracks, releases } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";

export default async function Dashboard() {
  const userId = await requireUserId();
  const list = await db.select().from(personas).where(eq(personas.userId, userId));

  // Fetch latest cover + track count for each persona
  const personaIds = list.map((p) => p.id);
  const covers: Record<string, string | null> = {};
  const trackCounts: Record<string, number> = {};
  let totalTracks = 0;
  let totalAlbums = 0;
  let totalReleases = 0;
  const statusBreakdown: Record<string, number> = {};

  if (personaIds.length > 0) {
    // Latest album cover per persona
    const coverRows = await db
      .selectDistinctOn([albums.personaId], {
        personaId: albums.personaId,
        coverUrl: albums.coverUrl,
      })
      .from(albums)
      .orderBy(albums.personaId, albums.createdAt);
    for (const r of coverRows) covers[r.personaId] = r.coverUrl;

    // Track count per persona
    const countRows = await db
      .select({ personaId: tracks.personaId, count: sql<number>`count(*)::int` })
      .from(tracks)
      .groupBy(tracks.personaId);
    for (const r of countRows) {
      trackCounts[r.personaId] = r.count;
      totalTracks += r.count;
    }

    // Status breakdown across all owned tracks
    const statusRows = await db
      .select({ status: tracks.status, count: sql<number>`count(*)::int` })
      .from(tracks)
      .where(inArray(tracks.personaId, personaIds))
      .groupBy(tracks.status);
    for (const r of statusRows) statusBreakdown[r.status] = r.count;

    const [albumAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(albums)
      .where(inArray(albums.personaId, personaIds));
    totalAlbums = albumAgg?.count ?? 0;

    const [releaseAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(releases)
      .where(inArray(releases.personaId, personaIds));
    totalReleases = releaseAgg?.count ?? 0;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/personas/new" className="btn">+ New persona</Link>
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat label="Personas" value={list.length} />
          <Stat label="Albums" value={totalAlbums} />
          <Stat label="Tracks" value={totalTracks} />
          <Stat label="Releases" value={totalReleases} />
          {Object.keys(statusBreakdown).length > 0 && (
            <div className="card col-span-2 md:col-span-4">
              <div className="label mb-2">Track status</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(statusBreakdown).map(([s, c]) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className="font-mono">{c}</span>
                    <span className="text-[color:var(--color-muted)]">{s}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="card col-span-full">
            <div className="font-medium mb-1">No personas yet</div>
            <div className="text-sm text-[color:var(--color-muted)] mb-4">
              Start by creating your first AI artist.
            </div>
            <Link href="/personas/new" className="btn">Create persona</Link>
          </div>
        )}
        {list.map((p) => {
          const cover = covers[p.id];
          const count = trackCounts[p.id] ?? 0;
          const genres = (p.genres ?? []).slice(0, 3);
          return (
            <Link
              key={p.id}
              href={`/personas/${p.id}`}
              className="card hover:border-[color:var(--color-accent)] overflow-hidden flex flex-col gap-3 p-0"
            >
              {cover ? (
                <div className="relative w-full aspect-video bg-[color:var(--color-bg-elev)]">
                  <Image
                    src={cover}
                    alt={p.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-[color:var(--color-bg-elev)] flex items-center justify-center text-3xl font-mono text-[color:var(--color-muted)]">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="px-4 pb-4 space-y-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-[color:var(--color-muted)] line-clamp-1">
                  {p.tagline ?? "No tagline yet"}
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {genres.map((g) => (
                    <span
                      key={g}
                      className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-bg-elev)] text-[color:var(--color-muted)]"
                    >
                      {g}
                    </span>
                  ))}
                  <span className="text-xs text-[color:var(--color-muted)] ml-auto">
                    {count} track{count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
