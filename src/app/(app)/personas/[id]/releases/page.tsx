import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, releases } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createRelease } from "./actions";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  if (!p) notFound();

  const [list, albumOpts] = await Promise.all([
    db
      .select({
        id: releases.id,
        distributor: releases.distributor,
        releaseDate: releases.releaseDate,
        albumTitle: albums.title,
      })
      .from(releases)
      .leftJoin(albums, eq(albums.id, releases.albumId))
      .where(eq(releases.personaId, id))
      .orderBy(desc(releases.releaseDate)),
    db
      .select({ id: albums.id, title: albums.title })
      .from(albums)
      .where(eq(albums.personaId, id)),
  ]);

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${id}` },
          { label: "Releases" },
        ]}
      />
      <PersonaTabs personaId={id} active="releases" />
      <h1 className="text-2xl font-semibold mb-1">{p.name} · Releases</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-8">
        Plan and track each release through prep, rights, distribution, and promo.
      </p>

      <div className="space-y-2 mb-8">
        {list.map((r) => (
          <Link
            key={r.id}
            href={`/personas/${id}/releases/${r.id}`}
            className="card flex justify-between items-center hover:border-[color:var(--color-accent)]"
          >
            <div>
              <div className="font-medium">
                {r.albumTitle ?? "Untitled release"}
              </div>
              <div className="text-xs text-[color:var(--color-muted)]">
                {r.distributor ?? "no distributor"} ·{" "}
                {r.releaseDate
                  ? new Date(r.releaseDate).toLocaleDateString()
                  : "no date"}
              </div>
            </div>
            <span className="text-xs text-[color:var(--color-muted)]">→</span>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="card text-sm text-[color:var(--color-muted)]">
            No releases yet.
          </div>
        )}
      </div>

      <form action={createRelease.bind(null, id)} className="card space-y-3">
        <h2 className="font-medium">New release</h2>
        <label className="block">
          <div className="label mb-1">Album (optional)</div>
          <select name="albumId" className="select">
            <option value="">— none —</option>
            {albumOpts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="label mb-1">Distributor</div>
            <input name="distributor" className="input" placeholder="DistroKid" />
          </label>
          <label className="block">
            <div className="label mb-1">Target date</div>
            <input type="date" name="releaseDate" className="input" />
          </label>
        </div>
        <button className="btn">Create release</button>
      </form>
    </div>
  );
}
