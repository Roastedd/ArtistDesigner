import Link from "next/link";
import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { Music2, Plus, Sparkles } from "lucide-react";
import { db } from "@/db";
import { personas, tracks } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import { SearchBar } from "@/components/search-bar";

const STATUS_COLORS: Record<string, string> = {
  idea: "text-[color:var(--color-muted)]",
  prompt: "text-blue-400",
  lyrics: "text-violet-400",
  demo: "text-amber-400",
  master: "text-green-400",
  released: "text-[color:var(--color-accent)]",
};

const STATUSES = ["idea", "prompt", "lyrics", "demo", "master", "released"] as const;

export default async function MyTracksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const term = (q ?? "").trim();
  const statusFilter = STATUSES.includes(status as typeof STATUSES[number])
    ? (status as typeof STATUSES[number])
    : undefined;

  const userId = await requireUserId();

  const owned = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(and(eq(personas.userId, userId), isNull(personas.deletedAt)));

  const personaIds = owned.map((p) => p.id);
  const personaMap = new Map(owned.map((p) => [p.id, p.name]));

  const rows = personaIds.length
    ? await db
        .select()
        .from(tracks)
        .where(
          and(
            inArray(tracks.personaId, personaIds),
            term ? ilike(tracks.title, `%${term}%`) : undefined,
            statusFilter ? eq(tracks.status, statusFilter) : undefined,
          ),
        )
        .orderBy(desc(tracks.createdAt))
    : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tracks</h1>
          <p className="text-[color:var(--color-muted)] mt-1 text-sm">
            Every track across all of your artists.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/library/tracks?new=ai" className="btn">
            <Sparkles className="h-4 w-4" /> Generate Track
          </Link>
          <Link href="/library/tracks?new=manual" className="btn btn-ghost">
            <Plus className="h-4 w-4" /> Add Track
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar placeholder="Search tracks…" />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Link
            href="/library/tracks"
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              !statusFilter
                ? "border-[color:var(--color-accent)] text-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10"
                : "border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
            }`}
          >
            All
          </Link>
          {STATUSES.map((s) => {
            const params = new URLSearchParams();
            if (term) params.set("q", term);
            params.set("status", s);
            const active = statusFilter === s;
            return (
              <Link
                key={s}
                href={`/library/tracks?${params.toString()}`}
                className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${
                  active
                    ? "border-[color:var(--color-accent)] text-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10"
                    : "border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
                }`}
              >
                {s}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        term || statusFilter ? (
          <div className="card text-center py-10">
            <p className="text-sm text-[color:var(--color-muted)]">
              No tracks match your filters.
            </p>
          </div>
        ) : (
          <div className="card text-center py-12">
            <Music2 className="h-10 w-10 mx-auto mb-3 text-[color:var(--color-muted)]" />
            <h2 className="font-semibold">No tracks yet</h2>
            <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
              Create your first artist to start writing tracks.
            </p>
            <Link href="/personas/new" className="btn inline-flex">
              <Sparkles className="h-4 w-4" /> Generate Artist
            </Link>
          </div>
        )
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-[color:var(--color-bg)] text-[color:var(--color-muted)]">
                <tr className="text-left">
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Artist</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">BPM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[color:var(--color-bg)]/60 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/personas/${t.personaId}/tracks/${t.id}`}
                        className="font-medium hover:text-[color:var(--color-accent)]"
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[color:var(--color-muted)]">
                      {personaMap.get(t.personaId) ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-2.5 capitalize ${
                        STATUS_COLORS[t.status] ?? ""
                      }`}
                    >
                      {t.status}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[color:var(--color-muted)]">
                      {t.bpm ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
