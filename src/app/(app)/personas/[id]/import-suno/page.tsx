import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import { PersonaTabs } from "../persona-tabs";
import { BulkImportForm } from "./bulk-import-form";

export default async function BulkImportPage({
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

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name, href: `/personas/${p.id}` },
          { label: "Import from Suno" },
        ]}
      />
      <PersonaTabs personaId={p.id} active="signature" />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bulk import from Suno / Udio
        </h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Paste your existing clips one block at a time, separated by{" "}
          <code className="rounded bg-[color:var(--color-bg-elev)] px-1">
            ---
          </code>
          . Each block becomes a saved track and feeds {p.name}&rsquo;s
          Signature.
        </p>
      </header>

      <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-4 text-sm">
        <p className="mb-2 font-medium">Format per block</p>
        <pre className="overflow-x-auto text-xs leading-relaxed text-[color:var(--color-muted)]">{`TITLE: Midnight Drive
URL: https://suno.com/song/abcd1234
STYLE: dark synthwave, female alto, 110 bpm, moody, anthemic chorus
LYRICS:
[Verse 1]
City lights bleed through the rain...
[Chorus]
Don't slow down, don't slow down...
---
TITLE: Next clip
URL: ...
STYLE: ...
LYRICS:
...`}</pre>
      </section>

      <BulkImportForm personaId={p.id} />
    </div>
  );
}
