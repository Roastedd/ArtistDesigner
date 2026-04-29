import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { PersonaTabs } from "../persona-tabs";
import { createEra, updateEra, deleteEra, listEras } from "./actions";
import { DeleteButton } from "@/components/delete-button";

export default async function ErasPage({
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

  const list = await listEras(id);

  return (
    <div className="max-w-4xl">
      <PersonaTabs personaId={id} active="eras" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Eras</h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Phases or chapters in this artist&apos;s story. Albums can be tagged
            to an era.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {list.length === 0 && (
          <div className="card text-sm text-[color:var(--color-muted)]">
            No eras yet. Create one below to organize albums into chapters.
          </div>
        )}
        {list.map((e) => (
          <form
            key={e.id}
            action={updateEra.bind(null, id, e.id)}
            className="card space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <input
                name="name"
                defaultValue={e.name}
                required
                className="input flex-1"
                placeholder="Era name"
              />
              <DeleteButton
                action={async () => {
                  "use server";
                  await deleteEra(id, e.id);
                }}
                label="Delete era"
                confirm={`Delete era "${e.name}"? Albums will become unassigned.`}
              />
            </div>
            <textarea
              name="description"
              defaultValue={e.description ?? ""}
              rows={2}
              className="input"
              placeholder="What defines this era? Sound, themes, visuals…"
            />
            <button className="btn">Save</button>
          </form>
        ))}
      </div>

      <form
        action={createEra.bind(null, id)}
        className="card space-y-3"
      >
        <h2 className="font-medium">Add era</h2>
        <input
          name="name"
          required
          className="input"
          placeholder="e.g. Neon Years, Acoustic Phase"
        />
        <textarea
          name="description"
          rows={2}
          className="input"
          placeholder="Optional description"
        />
        <button className="btn">Add era</button>
      </form>
    </div>
  );
}
