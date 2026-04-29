import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createAlbum } from "./actions";

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

  const list = await db.select().from(albums).where(eq(albums.personaId, id));

  return (
    <div className="max-w-4xl">
      <PersonaTabs personaId={id} active="albums" />

      <h1 className="text-2xl font-semibold mb-1">{p.name} · Albums</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-8">
        Group tracks into albums or EPs. Each album can have its own concept and
        cover art.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {list.map((a) => (
          <Link
            key={a.id}
            href={`/personas/${id}/albums/${a.id}`}
            className="card hover:border-[color:var(--color-accent)] flex gap-3"
          >
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
            <div className="min-w-0">
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-[color:var(--color-muted)] line-clamp-2">
                {a.concept ?? "No concept yet"}
              </div>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="card col-span-full text-sm text-[color:var(--color-muted)]">
            No albums yet. Create your first project below.
          </div>
        )}
      </div>

      <form action={createAlbum.bind(null, id)} className="card space-y-3">
        <h2 className="font-medium">New album</h2>
        <input name="title" required className="input" placeholder="Album title" />
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
