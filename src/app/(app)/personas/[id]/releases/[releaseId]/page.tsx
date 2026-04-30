import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, releases } from "@/db/schema";
import { PersonaTabs } from "../../persona-tabs";
import { updateRelease, deleteRelease } from "../actions";
import {
  RELEASE_CHECKLIST,
  PHASE_META,
  itemsByPhase,
} from "../checklist";
import { DeleteButton } from "@/components/delete-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ id: string; releaseId: string }>;
}) {
  const { id, releaseId } = await params;
  const userId = await requireUserId();

  const [row] = await db
    .select({ release: releases, persona: personas, album: albums })
    .from(releases)
    .innerJoin(personas, eq(personas.id, releases.personaId))
    .leftJoin(albums, eq(albums.id, releases.albumId))
    .where(
      and(
        eq(releases.id, releaseId),
        eq(personas.id, id),
        eq(personas.userId, userId),
      ),
    );
  if (!row) notFound();
  const { release, album } = row;
  const checklist = (release.checklist ?? {}) as Record<string, boolean>;

  const done = RELEASE_CHECKLIST.filter((k) => checklist[k]).length;
  const pct = Math.round((done / RELEASE_CHECKLIST.length) * 100);

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: row.persona.name, href: `/personas/${id}` },
          { label: "Releases", href: `/personas/${id}/releases` },
          { label: album?.title ?? "Release" },
        ]}
      />
      <PersonaTabs personaId={id} active="releases" />
      <Link
        href={`/personas/${id}/releases`}
        className="text-xs text-[color:var(--color-muted)] hover:text-white"
      >
        ← All releases
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-2 mb-1">
        {album?.title ?? "Untitled release"}
      </h1>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-[color:var(--color-muted)]">
          {done} / {RELEASE_CHECKLIST.length} complete · {pct}%
        </div>
        <DeleteButton
          action={async () => {
            "use server";
            await deleteRelease(releaseId);
          }}
          label="Delete release"
          confirm="Delete this release plan? Checklist progress will be lost."
        />
      </div>
      <div className="h-1 bg-[color:var(--color-bg-elev)] rounded mb-8 overflow-hidden">
        <div
          className="h-full bg-[color:var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <form
        action={updateRelease.bind(null, releaseId)}
        className="space-y-6"
      >
        <div className="card grid grid-cols-3 gap-3">
          <label className="block">
            <div className="label mb-1">Distributor</div>
            <input
              name="distributor"
              defaultValue={release.distributor ?? ""}
              className="input"
            />
          </label>
          <label className="block">
            <div className="label mb-1">UPC</div>
            <input
              name="upc"
              defaultValue={release.upc ?? ""}
              className="input"
            />
          </label>
          <label className="block">
            <div className="label mb-1">Release date</div>
            <input
              type="date"
              name="releaseDate"
              defaultValue={
                release.releaseDate
                  ? new Date(release.releaseDate).toISOString().slice(0, 10)
                  : ""
              }
              className="input"
            />
          </label>
        </div>

        {itemsByPhase().map(({ phase, items }) => {
          const phaseDone = items.filter((it) => checklist[it.id]).length;
          const meta = PHASE_META[phase];
          return (
            <div key={phase} className="card">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h2 className="font-medium">{meta.label}</h2>
                <span className="text-[11px] uppercase tracking-wide text-[color:var(--color-muted)]">
                  {meta.window} · {phaseDone}/{items.length}
                </span>
              </div>
              <p className="text-xs text-[color:var(--color-muted)] mb-3">
                {meta.intent}
              </p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={item.id}
                      name={`chk:${item.id}`}
                      defaultChecked={!!checklist[item.id]}
                      className="size-4 mt-0.5 accent-[color:var(--color-accent)]"
                    />
                    <label htmlFor={item.id} className="text-sm flex-1 cursor-pointer">
                      <div>{item.label}</div>
                      {item.description && (
                        <div className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <button className="btn">Save</button>
      </form>
    </div>
  );
}
