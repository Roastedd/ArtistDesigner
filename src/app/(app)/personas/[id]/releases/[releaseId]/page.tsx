import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { albums, personas, releases } from "@/db/schema";
import { PersonaTabs } from "../../persona-tabs";
import { updateRelease } from "../actions";
import { RELEASE_CHECKLIST } from "../checklist";

const PHASES: Array<{ label: string; prefix: string }> = [
  { label: "Prep", prefix: "prep" },
  { label: "Rights & IDs", prefix: "rights" },
  { label: "Distributor", prefix: "distributor" },
  { label: "Upload & Schedule", prefix: "upload" },
  { label: "Promo", prefix: "promo" },
  { label: "Post-Release", prefix: "post" },
];

const NICE: Record<string, string> = {
  "prep:concept_locked": "Concept locked",
  "prep:cover_art_final": "Cover art final",
  "prep:audio_mastered": "Audio mastered",
  "rights:isrc_assigned": "ISRC assigned",
  "rights:upc_assigned": "UPC assigned",
  "rights:metadata_final": "Metadata finalized",
  "distributor:account_ready": "Account ready",
  "distributor:splits_set": "Splits set",
  "upload:audio_uploaded": "Audio uploaded",
  "upload:scheduled_date": "Scheduled date confirmed",
  "promo:visual_assets": "Visual assets pack",
  "promo:short_clips": "Short-form clips ready",
  "promo:press_one_pager": "Press one-pager",
  "post:dsp_links_collected": "DSP links collected",
  "post:smartlink_published": "Smartlink published",
};

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
      <div className="text-sm text-[color:var(--color-muted)] mb-6">
        {done} / {RELEASE_CHECKLIST.length} complete · {pct}%
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

        {PHASES.map((phase) => {
          const items = RELEASE_CHECKLIST.filter((k) =>
            k.startsWith(`${phase.prefix}:`),
          );
          return (
            <div key={phase.prefix} className="card">
              <h2 className="font-medium mb-3">{phase.label}</h2>
              <ul className="space-y-2">
                {items.map((k) => (
                  <li key={k} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={k}
                      name={`chk:${k}`}
                      defaultChecked={!!checklist[k]}
                      className="size-4 accent-[color:var(--color-accent)]"
                    />
                    <label htmlFor={k} className="text-sm">
                      {NICE[k] ?? k}
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
