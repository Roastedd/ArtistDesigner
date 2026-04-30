"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { reorderAlbums } from "./actions";

type Album = {
  id: string;
  title: string;
  concept: string | null;
  coverUrl: string | null;
};

export default function AlbumList({
  personaId,
  albums: initial,
}: {
  personaId: string;
  albums: Album[];
}) {
  const [albums, setAlbums] = useState(initial);
  const [pending, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  function move(idx: number, dir: -1 | 1) {
    const next = [...albums];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setAlbums(next);
    start(() => reorderAlbums(personaId, next.map((a) => a.id)));
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = albums.findIndex((a) => a.id === dragId);
    const to = albums.findIndex((a) => a.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...albums];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setAlbums(next);
    setDragId(null);
    start(() => reorderAlbums(personaId, next.map((a) => a.id)));
  }

  if (albums.length === 0) {
    return (
      <div className="card text-sm text-[color:var(--color-muted)] mb-8">
        No albums yet. Create your first project below.
      </div>
    );
  }

  return (
    <div className={`grid md:grid-cols-2 gap-4 mb-8 ${pending ? "opacity-70" : ""}`}>
      {albums.map((a, i) => (
        <div
          key={a.id}
          draggable
          onDragStart={() => setDragId(a.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(a.id)}
          className={`card flex gap-3 group ${
            dragId === a.id ? "opacity-50" : ""
          } hover:border-[color:var(--color-accent)]`}
        >
          <Link href={`/personas/${personaId}/albums/${a.id}`} className="contents">
            {a.coverUrl ? (
              <Image
                src={a.coverUrl}
                alt={a.title}
                width={64}
                height={64}
                className="rounded border border-[color:var(--color-border)] aspect-square object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded border border-dashed border-[color:var(--color-border)] shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-[color:var(--color-muted)] line-clamp-2">
                {a.concept ?? "No concept yet"}
              </div>
            </div>
          </Link>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              disabled={i === albums.length - 1 || pending}
              className="text-xs px-1.5 py-0.5 rounded hover:bg-[color:var(--color-bg)] disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
