import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createAlbum } from "./actions";
import { listEras } from "../eras/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import AlbumList from "./album-list";

export default async function AlbumsPage({
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

  const list = await db
    .select()
    .from(albums)
    .where(eq(albums.personaId, id))
    .orderBy(asc(albums.orderIndex), asc(albums.createdAt));
  const eraList = await listEras(id);

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${id}` },
          { label: "Albums" },
        ]}
      />
      <PersonaTabs personaId={id} active="albums" />

      <h1 className="text-2xl font-semibold mb-1">{p.name} · Albums</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-8">
        Group tracks into albums or EPs. Each album can have its own concept and
        cover art.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {list.length === 0 && (
          <div className="card col-span-full text-sm text-[color:var(--color-muted)]">
            No albums yet. Create your first project below.
          </div>
        )}
      </div>
      {list.length > 0 && (
        <AlbumList
          personaId={id}
          albums={list.map((a) => ({
            id: a.id,
            title: a.title,
            concept: a.concept,
            coverUrl: a.coverUrl,
          }))}
        />
      )}

      <form action={createAlbum.bind(null, id)} className="card space-y-3">
        <h2 className="font-medium">New album</h2>
        <input name="title" required className="input" placeholder="Album title" />
        {eraList.length > 0 && (
          <label className="block">
            <div className="label mb-1">Era (optional)</div>
            <select name="eraId" className="select" defaultValue="">
              <option value="">— No era —</option>
              {eraList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <textarea
          name="concept"
          rows={3}
          className="input"
          placeholder="Concept / theme / lore (optional)"
        />
        <button className="btn">Create album</button>
      </form>
    </div>
  );
}
