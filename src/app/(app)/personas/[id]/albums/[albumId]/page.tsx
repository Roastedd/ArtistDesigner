import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";
import { PersonaTabs } from "../../persona-tabs";
import { createTrack, updateAlbum } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  prompt: "Prompt",
  lyrics: "Lyrics",
  demo: "Demo",
  master: "Master",
  released: "Released",
};

const STATUS_COLORS: Record<string, string> = {
  idea: "#6b7280",
  prompt: "#a78bfa",
  lyrics: "#60a5fa",
  demo: "#fbbf24",
  master: "#34d399",
  released: "#22d3ee",
};

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

  return (
    <div className="max-w-4xl">
      <PersonaTabs personaId={id} active="albums" />
      <Link
        href={`/personas/${id}/albums`}
        className="text-xs text-[color:var(--color-muted)] hover:text-white"
      >
        ← All albums
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-2 mb-1">{a.title}</h1>
      <p className="text-[color:var(--color-muted)] mb-8">{a.concept}</p>

      <div className="grid md:grid-cols-[200px_1fr] gap-6 mb-8">
        <div>
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
          <label className="block">
            <div className="label mb-1">Cover image URL</div>
            <input
              name="coverUrl"
              defaultValue={a.coverUrl ?? ""}
              className="input"
              placeholder="https://…"
              type="url"
            />
          </label>
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
      <div className="card divide-y divide-[color:var(--color-border)] p-0 mb-6">
        {list.length === 0 && (
          <div className="px-5 py-6 text-sm text-[color:var(--color-muted)]">
            No tracks yet. Add one below.
          </div>
        )}
        {list.map((t, i) => (
          <Link
            key={t.id}
            href={`/personas/${id}/tracks/${t.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-[color:var(--color-bg)]"
          >
            <div className="font-mono text-xs text-[color:var(--color-muted)] w-6">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 font-medium">{t.title}</div>
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: STATUS_COLORS[t.status],
                borderColor: STATUS_COLORS[t.status],
              }}
            >
              {STATUS_LABELS[t.status]}
            </span>
          </Link>
        ))}
      </div>

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
