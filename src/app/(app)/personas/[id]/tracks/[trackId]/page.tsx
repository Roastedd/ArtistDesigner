import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, lyricVersions, personas, promptVersions, tracks } from "@/db/schema";
import { updateTrack } from "../actions";
import { deleteTrack } from "../../albums/actions";
import TrackStudio from "./track-studio";
import { AudioUploadField } from "./audio-upload-field";
import { DeleteButton } from "@/components/delete-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

const STATUSES = ["idea", "prompt", "lyrics", "demo", "master", "released"] as const;

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string; trackId: string }>;
}) {
  const { id, trackId } = await params;
  const userId = await requireUserId();

  const [row] = await db
    .select({ track: tracks, persona: personas, album: albums })
    .from(tracks)
    .innerJoin(personas, eq(personas.id, tracks.personaId))
    .leftJoin(albums, eq(albums.id, tracks.albumId))
    .where(
      and(
        eq(tracks.id, trackId),
        eq(personas.id, id),
        eq(personas.userId, userId),
      ),
    );
  if (!row) notFound();

  const { track, persona, album } = row;

  const [prompts, lyrics] = await Promise.all([
    db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.trackId, trackId))
      .orderBy(desc(promptVersions.createdAt)),
    db
      .select()
      .from(lyricVersions)
      .where(eq(lyricVersions.trackId, trackId))
      .orderBy(desc(lyricVersions.createdAt)),
  ]);

  return (
    <div className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: persona.name, href: `/personas/${id}` },
          album
            ? { label: "Albums", href: `/personas/${id}/albums` }
            : { label: "Tracks", href: `/personas/${id}/tracks` },
          ...(album
            ? [{ label: album.title, href: `/personas/${id}/albums/${album.id}` }]
            : []),
          { label: track.title },
        ]}
      />
      <Link
        href={
          album
            ? `/personas/${id}/albums/${album.id}`
            : `/personas/${id}/albums`
        }
        className="text-xs text-[color:var(--color-muted)] hover:text-white"
      >
        ← {album ? album.title : "Albums"}
      </Link>

      <div className="flex items-baseline justify-between mt-2 mb-1">
        <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[color:var(--color-muted)]">
            {persona.name}
          </div>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteTrack(id, trackId, album?.id ?? null);
              redirect(album ? `/personas/${id}/albums/${album.id}` : `/personas/${id}/tracks`);
            }}
            label="Delete track"
            confirm={`Delete track "${track.title}"? All prompt and lyric versions will be removed.`}
          />
        </div>
      </div>

      <form
        action={updateTrack.bind(null, trackId)}
        className="card space-y-3 mb-6"
      >
        <div className="grid md:grid-cols-[1fr_180px] gap-3">
          <label className="block">
            <div className="label mb-1">Title</div>
            <input name="title" defaultValue={track.title} className="input" />
          </label>
          <label className="block">
            <div className="label mb-1">Status</div>
            <select name="status" defaultValue={track.status} className="select">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <div className="label mb-1">BPM</div>
            <input
              name="bpm"
              type="number"
              min={20}
              max={400}
              defaultValue={track.bpm ?? ""}
              className="input"
            />
          </label>
          <label className="block">
            <div className="label mb-1">Key</div>
            <input
              name="keySignature"
              defaultValue={track.keySignature ?? ""}
              className="input"
              placeholder="e.g. Am, F#"
            />
          </label>
          <AudioUploadField defaultValue={track.audioUrl ?? ""} />
        </div>
        {track.audioUrl && (
          <audio controls src={track.audioUrl} className="w-full" />
        )}
        <label className="block">
          <div className="label mb-1">Notes</div>
          <textarea
            name="notes"
            defaultValue={track.notes ?? ""}
            rows={2}
            className="input"
          />
        </label>
        <button className="btn">Save</button>
      </form>

      <TrackStudio
        personaId={id}
        trackId={trackId}
        initialPrompts={prompts.map((p) => ({
          id: p.id,
          target: p.target,
          body: p.body,
          model: p.model,
          createdAt: p.createdAt.toISOString(),
        }))}
        initialLyrics={lyrics.map((l) => ({
          id: l.id,
          body: l.body,
          structure: l.structure ?? [],
          model: l.model,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
