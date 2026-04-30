import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, eras, personas, tracks } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createTrack } from "../albums/actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatusSelect } from "./status-select";

type SearchParams = {
  q?: string;
  status?: string;
  era?: string;
  bpmMin?: string;
  bpmMax?: string;
};

const STATUSES = ["idea", "prompt", "lyrics", "demo", "master", "released"] as const;
type Status = (typeof STATUSES)[number];

export default async function TracksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const userId = await requireUserId();

  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  if (!p) notFound();

  const eraList = await db
    .select()
    .from(eras)
    .where(eq(eras.personaId, id))
    .orderBy(asc(eras.orderIndex));

  const conds = [eq(tracks.personaId, id)];
  if (sp.q?.trim()) conds.push(ilike(tracks.title, `%${sp.q.trim()}%`));
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) {
    conds.push(eq(tracks.status, sp.status as Status));
  }
  if (sp.bpmMin) {
    const n = Number(sp.bpmMin);
    if (Number.isFinite(n)) conds.push(sql`${tracks.bpm} >= ${n}`);
  }
  if (sp.bpmMax) {
    const n = Number(sp.bpmMax);
    if (Number.isFinite(n)) conds.push(sql`${tracks.bpm} <= ${n}`);
  }
  if (sp.era) {
    if (sp.era === "_none") {
      conds.push(sql`${tracks.albumId} IS NULL`);
    } else {
      const albumIdsForEra = await db
        .select({ id: albums.id })
        .from(albums)
        .where(and(eq(albums.personaId, id), eq(albums.eraId, sp.era)));
      if (albumIdsForEra.length === 0) {
        conds.push(sql`false`);
      } else {
        conds.push(inArray(tracks.albumId, albumIdsForEra.map((a) => a.id)));
      }
    }
  }

  const list = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      status: tracks.status,
      bpm: tracks.bpm,
      keySignature: tracks.keySignature,
      albumId: tracks.albumId,
      albumTitle: albums.title,
      eraId: albums.eraId,
    })
    .from(tracks)
    .leftJoin(albums, eq(albums.id, tracks.albumId))
    .where(and(...conds))
    .orderBy(asc(tracks.createdAt));

  const hasFilters = !!(sp.q || sp.status || sp.era || sp.bpmMin || sp.bpmMax);

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${id}` },
          { label: "Tracks" },
        ]}
      />
      <PersonaTabs personaId={id} active="tracks" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All tracks</h1>
        <span className="text-xs text-[color:var(--color-muted)]">
          {list.length} {list.length === 1 ? "track" : "tracks"}
        </span>
      </div>

      <form
        method="get"
        className="card grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 items-end"
      >
        <label className="col-span-2">
          <div className="label mb-1">Search</div>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Title…"
            className="input"
          />
        </label>
        <label>
          <div className="label mb-1">Status</div>
          <select name="status" defaultValue={sp.status ?? ""} className="select">
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="label mb-1">Era</div>
          <select name="era" defaultValue={sp.era ?? ""} className="select">
            <option value="">Any</option>
            <option value="_none">No album</option>
            {eraList.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="label mb-1">BPM min</div>
          <input
            name="bpmMin"
            type="number"
            min={1}
            defaultValue={sp.bpmMin ?? ""}
            className="input"
          />
        </label>
        <label>
          <div className="label mb-1">BPM max</div>
          <input
            name="bpmMax"
            type="number"
            min={1}
            defaultValue={sp.bpmMax ?? ""}
            className="input"
          />
        </label>
        <div className="col-span-2 md:col-span-6 flex gap-2">
          <button className="btn">Apply</button>
          {hasFilters && (
            <Link href={`/personas/${id}/tracks`} className="btn-ghost btn">
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="card divide-y divide-[color:var(--color-border)] p-0 mb-6">
        {list.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--color-muted)]">
            {hasFilters
              ? "No tracks match those filters."
              : "No tracks yet. Add a quick idea below or attach one to an album."}
          </div>
        )}
        {list.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-5 py-3 hover:bg-[color:var(--color-bg)]"
          >
            <Link
              href={`/personas/${id}/tracks/${t.id}`}
              className="flex-1 min-w-0"
            >
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-xs text-[color:var(--color-muted)] truncate">
                {t.albumTitle ?? "Unassigned"}
                {t.bpm ? ` · ${t.bpm} BPM` : ""}
                {t.keySignature ? ` · ${t.keySignature}` : ""}
              </div>
            </Link>
            <StatusSelect personaId={id} trackId={t.id} value={t.status} />
          </div>
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
