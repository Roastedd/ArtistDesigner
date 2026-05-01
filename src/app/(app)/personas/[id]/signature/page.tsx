import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ExternalLink, Pin, PinOff, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import {
  getPersonaSignature,
  setExemplar,
} from "../../suno-capture-actions";
import { PersonaTabs } from "../persona-tabs";

const TYPE_ORDER: { key: string; label: string }[] = [
  { key: "genre", label: "Genres" },
  { key: "mood", label: "Moods" },
  { key: "vocal", label: "Vocal" },
  { key: "instrument", label: "Instrumentation" },
  { key: "tempo", label: "Tempo" },
  { key: "tag", label: "Other tags" },
];

export default async function SignaturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [p] = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  if (!p) notFound();

  const { groups, exemplars } = await getPersonaSignature(id, 12);
  const totalSignals = Object.values(groups).reduce(
    (n, list) => n + list.length,
    0,
  );

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${id}` },
          { label: "Signature" },
        ]}
      />
      <PersonaTabs personaId={id} active="signature" />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[color:var(--color-accent)]" />
          {p.name}&apos;s signature
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Built automatically from every Suno/Udio clip you save back here.
          The bigger a tag, the more often it shows up in clips that worked.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={`/personas/${id}/import-suno`}
            className="btn-ghost"
          >
            Bulk import from Suno
          </Link>
        </div>
      </header>

      {totalSignals === 0 && exemplars.length === 0 ? (
        <EmptyState personaId={id} />
      ) : (
        <div className="space-y-6">
          {exemplars.length > 0 && (
            <ExemplarSection exemplars={exemplars} />
          )}
          <SignalGroups groups={groups} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ personaId }: { personaId: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--color-border)] p-8 text-center space-y-3">
      <Sparkles className="h-8 w-8 mx-auto text-[color:var(--color-muted)]" />
      <h2 className="text-lg font-semibold">No signals yet</h2>
      <p className="text-sm text-[color:var(--color-muted)] max-w-md mx-auto">
        Save your first Suno clip and this artist&apos;s signature starts
        building. Every style tag and every pinned clip becomes part of the
        DNA the AI uses for future generations.
      </p>
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <Link
          href="/guides/first-song?step=5"
          className="btn-primary inline-flex items-center gap-1.5"
        >
          Open the Save step
        </Link>
        <Link
          href={`/personas/${personaId}/import-suno`}
          className="btn-ghost inline-flex items-center gap-1.5"
        >
          Bulk import from Suno
        </Link>
        <Link
          href={`/personas/${personaId}/tracks`}
          className="btn-ghost inline-flex items-center gap-1.5"
        >
          Or add a track manually
        </Link>
      </div>
    </div>
  );
}

function SignalGroups({
  groups,
}: {
  groups: Record<string, { value: string; weight: number }[]>;
}) {
  const maxWeight = Math.max(
    1,
    ...Object.values(groups).flatMap((list) => list.map((s) => s.weight)),
  );
  return (
    <section className="space-y-4">
      {TYPE_ORDER.map(({ key, label }) => {
        const list = groups[key];
        if (!list || list.length === 0) return null;
        return (
          <div key={key}>
            <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)] mb-2">
              {label}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((s) => {
                const scale = 0.85 + (s.weight / maxWeight) * 0.55;
                return (
                  <span
                    key={s.value}
                    style={{ fontSize: `${scale}rem` }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]"
                    title={`Seen in ${s.weight} clip${s.weight > 1 ? "s" : ""}`}
                  >
                    {s.value}
                    <span className="text-[10px] text-[color:var(--color-muted)] tabular-nums">
                      ×{s.weight}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ExemplarSection({
  exemplars,
}: {
  exemplars: {
    trackId: string;
    stylePrompt: string | null;
    pinnedAt: Date;
    title: string;
    externalUrl: string | null;
    externalSource: string | null;
  }[];
}) {
  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-[color:var(--color-muted)] flex items-center gap-1.5">
        <Pin className="h-3 w-3" /> Pinned exemplars ({exemplars.length})
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        These clips are the canonical reference. Their style prompts get fed
        into the Forge as in-context examples for future generations.
      </p>
      <div className="space-y-2">
        {exemplars.map((ex) => (
          <ExemplarCard key={ex.trackId} exemplar={ex} />
        ))}
      </div>
    </section>
  );
}

function ExemplarCard({
  exemplar,
}: {
  exemplar: {
    trackId: string;
    stylePrompt: string | null;
    title: string;
    externalUrl: string | null;
    externalSource: string | null;
  };
}) {
  const unpin = async () => {
    "use server";
    await setExemplar(exemplar.trackId, false);
  };
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{exemplar.title}</div>
          {exemplar.externalSource && (
            <div className="text-[11px] text-[color:var(--color-muted)] uppercase tracking-wider">
              from {exemplar.externalSource}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exemplar.externalUrl && (
            <a
              href={exemplar.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <form action={unpin}>
            <button
              type="submit"
              className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] inline-flex items-center gap-1"
              title="Unpin this exemplar"
            >
              <PinOff className="h-3 w-3" /> Unpin
            </button>
          </form>
        </div>
      </div>
      {exemplar.stylePrompt && (
        <div className="text-xs font-mono text-[color:var(--color-muted)] bg-[color:var(--color-bg-elev)] rounded px-2 py-1.5 break-words">
          {exemplar.stylePrompt}
        </div>
      )}
    </div>
  );
}
