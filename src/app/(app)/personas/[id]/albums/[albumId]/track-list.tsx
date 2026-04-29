"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reorderTracks, deleteTrack } from "../actions";

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

type Track = { id: string; title: string; status: string };

export default function TrackList({
  personaId,
  albumId,
  tracks: initial,
}: {
  personaId: string;
  albumId: string | null;
  tracks: Track[];
}) {
  const [tracks, setTracks] = useState<Track[]>(initial);
  const [pending, start] = useTransition();

  function move(idx: number, dir: -1 | 1) {
    const next = [...tracks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setTracks(next);
    start(() => reorderTracks(personaId, albumId, next.map((t) => t.id)));
  }

  function remove(t: Track) {
    if (!window.confirm(`Delete track "${t.title}"? All prompt and lyric versions will be removed.`)) {
      return;
    }
    setTracks((cur) => cur.filter((x) => x.id !== t.id));
    start(() => deleteTrack(personaId, t.id, albumId));
  }

  if (tracks.length === 0) {
    return (
      <div className="card mb-6">
        <div className="text-sm text-[color:var(--color-muted)]">
          No tracks yet. Add one below.
        </div>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-[color:var(--color-border)] p-0 mb-6">
      {tracks.map((t, i) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-5 py-2.5 group ${
            pending ? "opacity-60" : ""
          }`}
        >
          <div className="font-mono text-xs text-[color:var(--color-muted)] w-6">
            {String(i + 1).padStart(2, "0")}
          </div>
          <Link
            href={`/personas/${personaId}/tracks/${t.id}`}
            className="flex-1 font-medium hover:underline"
          >
            {t.title}
          </Link>
          <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{
              color: STATUS_COLORS[t.status],
              borderColor: STATUS_COLORS[t.status],
            }}
          >
            {STATUS_LABELS[t.status]}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0 || pending}
              className="text-xs px-1.5 py-0.5 rounded hover:bg-[color:var(--color-bg)] disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === tracks.length - 1 || pending}
              className="text-xs px-1.5 py-0.5 rounded hover:bg-[color:var(--color-bg)] disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-xs px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/10"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
