import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";

export const revalidate = 60;

export default async function PublicPersonaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.slug, slug), eq(personas.isPublic, true)));
  if (!p) notFound();

  const [albumList, trackList] = await Promise.all([
    db.select().from(albums).where(eq(albums.personaId, p.id)),
    db
      .select()
      .from(tracks)
      .where(eq(tracks.personaId, p.id))
      .orderBy(asc(tracks.orderIndex)),
  ]);

  const palette = (p.colorPalette ?? []).slice(0, 5);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header
        className="border-b border-[color:var(--color-border)]"
        style={
          palette.length
            ? {
                background: `linear-gradient(135deg, ${palette.join(", ")})`,
              }
            : undefined
        }
      >
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-xs font-mono opacity-70 mb-2">
            artistdesigner.app/p/{p.slug}
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight">
            {p.name}
          </h1>
          {p.tagline && (
            <p className="text-lg mt-3 opacity-90">{p.tagline}</p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {p.bio && (
          <section>
            <h2 className="label mb-3">About</h2>
            <p className="leading-relaxed text-[color:var(--color-fg)]/90 whitespace-pre-wrap">
              {p.bio}
            </p>
          </section>
        )}

        {(p.genres?.length || p.influences?.length) && (
          <section className="grid sm:grid-cols-2 gap-6">
            {p.genres?.length ? (
              <div>
                <h2 className="label mb-2">Sound</h2>
                <div className="flex flex-wrap gap-2">
                  {p.genres.map((g) => (
                    <span
                      key={g}
                      className="text-xs px-2 py-1 rounded-full border border-[color:var(--color-border)]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {p.influences?.length ? (
              <div>
                <h2 className="label mb-2">Influences</h2>
                <div className="text-sm text-[color:var(--color-muted)]">
                  {p.influences.join(" · ")}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {albumList.length > 0 && (
          <section>
            <h2 className="label mb-3">Discography</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {albumList.map((a) => (
                <li key={a.id} className="card flex gap-3">
                  {a.coverUrl ? (
                    <Image
                      src={a.coverUrl}
                      alt={a.title}
                      width={80}
                      height={80}
                      className="rounded border border-[color:var(--color-border)] aspect-square object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-20 h-20 rounded border border-dashed border-[color:var(--color-border)] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{a.title}</div>
                    {a.releaseDate && (
                      <div className="text-[10px] font-mono text-[color:var(--color-muted)]">
                        {new Date(a.releaseDate).toISOString().slice(0, 10)}
                      </div>
                    )}
                    {a.concept && (
                      <div className="text-sm text-[color:var(--color-muted)] mt-1 line-clamp-3">
                        {a.concept}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {trackList.length > 0 && (
          <section>
            <h2 className="label mb-3">Tracks</h2>
            <ul className="divide-y divide-[color:var(--color-border)] card p-0">
              {trackList.map((t, i) => (
                <li
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span className="font-mono text-xs text-[color:var(--color-muted)] w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{t.title}</span>
                  <span className="text-xs text-[color:var(--color-muted)]">
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pt-8 border-t border-[color:var(--color-border)] text-xs text-[color:var(--color-muted)]">
          made with ArtistDesigner
        </footer>
      </main>
    </div>
  );
}
