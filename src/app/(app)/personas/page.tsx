import Link from "next/link";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { SearchBar } from "@/components/search-bar";
import { Sparkles } from "lucide-react";

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const userId = await requireUserId();
  const term = (q ?? "").trim();
  const list = await db
    .select()
    .from(personas)
    .where(
      and(
        eq(personas.userId, userId),
        isNull(personas.deletedAt),
        term
          ? or(
              ilike(personas.name, `%${term}%`),
              ilike(personas.tagline, `%${term}%`),
              sql`${personas.genres}::text ilike ${"%" + term + "%"}`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(personas.createdAt));

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">My Artists</h1>
        <div className="flex items-center gap-2">
          <Link href="/personas/trash" className="btn-ghost btn">
            Trash
          </Link>
          <Link href="/personas/import" className="btn-ghost btn">
            Import
          </Link>
          <Link href="/personas/new" className="btn">
            + New artist
          </Link>
        </div>
      </div>
      <div className="mb-6">
        <SearchBar placeholder="Search by name, tagline, or genre…" />
        {term && (
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {list.length} match{list.length === 1 ? "" : "es"} for{" "}
            <span className="font-mono">{term}</span>
          </p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {list.length === 0 && !term && (
          <div className="card sm:col-span-2 text-center py-12">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="text-lg font-medium mb-1">No artists yet</div>
            <div className="text-sm text-[color:var(--color-muted)] mb-4">
              Create your first AI artist persona to get started.
            </div>
            <Link href="/personas/new" className="btn inline-flex">
              + Create artist
            </Link>
          </div>
        )}
        {list.length === 0 && term && (
          <div className="card sm:col-span-2 text-center py-10">
            <div className="text-sm text-[color:var(--color-muted)]">
              No artists match{" "}
              <span className="font-mono">{term}</span>.
            </div>
          </div>
        )}
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/personas/${p.id}`}
            className="card hover:border-[color:var(--color-accent)] transition-colors"
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-[color:var(--color-muted)] line-clamp-2">
              {p.tagline}
            </div>
            <div className="mt-3 text-xs text-[color:var(--color-muted)] truncate">
              {(p.genres ?? []).join(" · ")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
