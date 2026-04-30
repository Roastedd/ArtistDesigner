import Link from "next/link";
import Image from "next/image";
import { eq, desc } from "drizzle-orm";
import { Globe2, Sparkles } from "lucide-react";
import { db } from "@/db";
import { personas, albums } from "@/db/schema";

export default async function ExplorePage() {
  const rows = await db
    .select({
      id: personas.id,
      slug: personas.slug,
      name: personas.name,
      tagline: personas.tagline,
    })
    .from(personas)
    .where(eq(personas.isPublic, true))
    .orderBy(desc(personas.createdAt))
    .limit(60);

  // best-effort cover lookup
  const covers = new Map<string, string | null>();
  if (rows.length) {
    const coverRows = await db
      .selectDistinctOn([albums.personaId], {
        personaId: albums.personaId,
        coverUrl: albums.coverUrl,
      })
      .from(albums)
      .orderBy(albums.personaId, desc(albums.createdAt));
    for (const r of coverRows) covers.set(r.personaId, r.coverUrl);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Globe2 className="h-6 w-6 text-[color:var(--color-accent)]" />
          Explore
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          Public artists from across the studio community.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-16">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-[color:var(--color-muted)]" />
          <h2 className="font-semibold">Nothing public yet</h2>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Toggle one of your artists to Public to seed Explore.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.slug}`}
              className="group rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] overflow-hidden hover:border-[color:var(--color-accent)] transition-colors"
            >
              <div className="aspect-square bg-[color:var(--color-bg)] relative">
                {covers.get(p.id) ? (
                  <Image
                    src={covers.get(p.id)!}
                    alt={p.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-mono text-[color:var(--color-muted)]">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-medium truncate">{p.name}</div>
                {p.tagline && (
                  <div className="text-xs text-[color:var(--color-muted)] truncate mt-0.5">
                    {p.tagline}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
