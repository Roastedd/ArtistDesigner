import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";
import { PersonaTabs } from "../../persona-tabs";
import { createTrack, updateAlbum, deleteAlbum, generateAlbumCover } from "../actions";
import { listEras } from "../../eras/actions";
import { DeleteButton } from "@/components/delete-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import TrackList from "./track-list";
import { CoverUploadField } from "./cover-upload-field";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string; albumId: string }>;
}) {
  const { id, albumId } = await params;
  const userId = await requireUserId();

  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  if (!p) notFound();

  const [a] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.personaId, id)));
  if (!a) notFound();

  const list = await db
    .select()
    .from(tracks)
    .where(eq(tracks.albumId, albumId))
    .orderBy(asc(tracks.orderIndex));

  const eraList = await listEras(id);

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${id}` },
          { label: "Albums", href: `/personas/${id}/albums` },
          { label: a.title },
        ]}
      />
      <PersonaTabs personaId={id} active="albums" />
      <Link
        href={`/personas/${id}/albums`}
        className="text-xs text-[color:var(--color-muted)] hover:text-white"
      >
        ← All albums
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-2 mb-1">{a.title}</h1>
      <div className="flex items-baseline justify-between mb-8">
        <p className="text-[color:var(--color-muted)]">{a.concept}</p>
        <DeleteButton
          action={async () => {
            "use server";
            await deleteAlbum(id, albumId);
          }}
          label="Delete album"
          confirm={`Delete album "${a.title}"? Tracks remain but become unassigned.`}
        />
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-6 mb-8">
        <div className="space-y-2">
          {a.coverUrl ? (
            <Image
              src={a.coverUrl}
              alt={a.title}
              width={200}
              height={200}
              className="rounded-lg border border-[color:var(--color-border)] aspect-square object-cover"
              unoptimized
            />
          ) : (
            <div className="rounded-lg border border-dashed border-[color:var(--color-border)] aspect-square flex items-center justify-center text-xs text-[color:var(--color-muted)]">
              No cover
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await generateAlbumCover(id, albumId);
            }}
          >
            <button className="btn-ghost btn text-xs w-full justify-center">
              ✨ Generate cover art
            </button>
          </form>
        </div>
        <form
          action={updateAlbum.bind(null, id, albumId)}
          className="card space-y-3"
        >
          <h2 className="font-medium">Album details</h2>
          <label className="block">
            <div className="label mb-1">Title</div>
            <input name="title" defaultValue={a.title} className="input" required />
          </label>
          <label className="block">
            <div className="label mb-1">Concept</div>
            <textarea
              name="concept"
              defaultValue={a.concept ?? ""}
              rows={2}
              className="input"
            />
          </label>
          <CoverUploadField defaultValue={a.coverUrl ?? ""} />
          {eraList.length > 0 && (
            <label className="block">
              <div className="label mb-1">Era</div>
              <select
                name="eraId"
                className="select"
                defaultValue={a.eraId ?? ""}
              >
                <option value="">— No era —</option>
                {eraList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <div className="label mb-1">Release date</div>
            <input
              name="releaseDate"
              type="date"
              defaultValue={
                a.releaseDate
                  ? new Date(a.releaseDate).toISOString().slice(0, 10)
                  : ""
              }
              className="input"
            />
          </label>
          <button className="btn">Save album</button>
        </form>
      </div>

      <h2 className="font-medium mb-3">Tracks</h2>
      <TrackList
        personaId={id}
        albumId={albumId}
        tracks={list.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
        }))}
      />

      <form
        action={createTrack.bind(null, id, albumId)}
        className="card space-y-3"
      >
        <h2 className="font-medium">Add track</h2>
        <input name="title" required className="input" placeholder="Track title" />
        <button className="btn">Add</button>
      </form>
    </div>
  );
}
