import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, tracks } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createTrack } from "../albums/actions";

const STATUS_COLORS: Record<string, string> = {
  idea: "#6b7280",
  prompt: "#a78bfa",
  lyrics: "#60a5fa",
  demo: "#fbbf24",
  master: "#34d399",
  released: "#22d3ee",
};

export default async function TracksPage({
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
    .select({
      id: tracks.id,
      title: tracks.title,
      status: tracks.status,
      albumId: tracks.albumId,
      albumTitle: albums.title,
    })
    .from(tracks)
    .leftJoin(albums, eq(albums.id, tracks.albumId))
    .where(eq(tracks.personaId, id))
    .orderBy(asc(tracks.createdAt));

  return (
    <div className="max-w-4xl">
      <PersonaTabs personaId={id} active="tracks" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All tracks</h1>
        <span className="text-xs text-[color:var(--color-muted)]">
          {list.length} {list.length === 1 ? "track" : "tracks"}
        </span>
      </div>

      <div className="card divide-y divide-[color:var(--color-border)] p-0 mb-6">
        {list.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--color-muted)]">
            No tracks yet. Add a quick idea below or attach one to an album.
          </div>
        )}
        {list.map((t) => (
          <Link
            key={t.id}
            href={`/personas/${id}/tracks/${t.id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-[color:var(--color-bg)]"
          >
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-[color:var(--color-muted)]">
                {t.albumTitle ?? "Unassigned"}
              </div>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: STATUS_COLORS[t.status],
                borderColor: STATUS_COLORS[t.status],
              }}
            >
              {t.status}
            </span>
          </Link>
        ))}
      </div>

      <form
        action={createTrack.bind(null, id, null)}
        className="card space-y-3"
      >
        <h2 className="font-medium">Quick track idea</h2>
        <input
          name="title"
          required
          className="input"
          placeholder="Working title"
        />
        <button className="btn">Add track</button>
      </form>
    </div>
  );
}
