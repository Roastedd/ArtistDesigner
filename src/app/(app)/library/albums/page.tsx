import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { Disc3, Plus, Sparkles } from "lucide-react";
import { db } from "@/db";
import { albums, personas } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import { SearchBar } from "@/components/search-bar";
import { PersonaPickerModal } from "@/components/persona-picker-modal";

export default async function MyAlbumsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string }>;
}) {
  const { q, new: newParam } = await searchParams;
  const term = (q ?? "").trim();
  const newMode = newParam === "ai" || newParam === "manual" ? newParam : null;
  const userId = await requireUserId();

  const owned = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(and(eq(personas.userId, userId), isNull(personas.deletedAt)))
    .orderBy(asc(personas.name));

  // Handle ?new=ai|manual launched from sidebar/dashboard.
  if (newMode) {
    if (owned.length === 0) redirect("/personas/new");
    if (owned.length === 1) redirect(`/personas/${owned[0].id}/albums`);
    // Otherwise we render the picker modal below.
  }

  const personaIds = owned.map((p) => p.id);
  const personaMap = new Map(owned.map((p) => [p.id, p.name]));

  const rows = personaIds.length
    ? await db
        .select()
        .from(albums)
        .where(
          and(
            inArray(albums.personaId, personaIds),
            term ? ilike(albums.title, `%${term}%`) : undefined,
          ),
        )
        .orderBy(desc(albums.createdAt))
    : [];

  return (
    <div className="space-y-6 animate-fade-up">
      {newMode && owned.length > 1 && (
        <PersonaPickerModal
          personas={owned}
          kind="album"
          mode={newMode}
        />
      )}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Albums</h1>
          <p className="text-[color:var(--color-muted)] mt-1 text-sm">
            Every album across all of your artists.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/library/albums?new=ai" className="btn">
            <Sparkles className="h-4 w-4" /> Generate Album
          </Link>
          <Link href="/library/albums?new=manual" className="btn btn-ghost">
            <Plus className="h-4 w-4" /> Build Album
          </Link>
        </div>
      </div>

      <SearchBar placeholder="Search albums…" />

      {rows.length === 0 ? (
        term ? (
          <div className="card text-center py-10">
            <p className="text-sm text-[color:var(--color-muted)]">
              No albums match <span className="font-mono">{term}</span>.
            </p>
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/personas/${a.personaId}/albums/${a.id}`}
              className="group rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] overflow-hidden hover:border-[color:var(--color-accent)] transition-colors"
            >
              <div className="aspect-square bg-[color:var(--color-bg)] relative">
                {a.coverUrl ? (
                  <Image
                    src={a.coverUrl}
                    alt={a.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[color:var(--color-muted)]">
                    <Disc3 className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-[color:var(--color-muted)] truncate mt-0.5">
                  {personaMap.get(a.personaId) ?? "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <Disc3 className="h-10 w-10 mx-auto mb-3 text-[color:var(--color-muted)]" />
      <h2 className="font-semibold">No albums yet</h2>
      <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
        Create an album from one of your artist pages.
      </p>
      <Link href="/personas" className="btn inline-flex">
        Open My Artists
      </Link>
    </div>
  );
}
