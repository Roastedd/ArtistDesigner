import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { updatePersona, deletePersona } from "../actions";
import { PersonaTabs } from "./persona-tabs";
import PromptForge from "./prompt-forge";
import { DeleteButton } from "@/components/delete-button";

export default async function PersonaPage({
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

  const arr = (a: string[] | null | undefined) => (a ?? []).join(", ");

  return (
    <div className="max-w-4xl">
      <PersonaTabs personaId={id} active="studio" />
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[color:var(--color-muted)] font-mono">{p.slug}</div>
          <DeleteButton
            action={async () => {
              "use server";
              await deletePersona(p.id);
            }}
            label="Delete persona"
            confirm={`Permanently delete "${p.name}"? All albums, tracks, and lyric versions will be removed. This cannot be undone.`}
          />
        </div>
      </div>
      <p className="text-[color:var(--color-muted)] mb-8">{p.tagline}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <form action={updatePersona.bind(null, p.id)} className="card space-y-3">
          <h2 className="font-medium mb-2">Identity</h2>
          <Field label="Name" name="name" defaultValue={p.name} />
          <Field label="Tagline" name="tagline" defaultValue={p.tagline ?? ""} />
          <Field label="Bio" name="bio" textarea defaultValue={p.bio ?? ""} />
          <Field label="Influences (csv)" name="influences" defaultValue={arr(p.influences)} />

          <h2 className="font-medium pt-4">Sonic DNA</h2>
          <Field label="Genres (csv)" name="genres" defaultValue={arr(p.genres)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="BPM min" name="bpmMin" defaultValue={p.bpmMin?.toString() ?? ""} />
            <Field label="BPM max" name="bpmMax" defaultValue={p.bpmMax?.toString() ?? ""} />
          </div>
          <Field label="Vocal style" name="vocalStyle" defaultValue={p.vocalStyle ?? ""} />
          <Field label="Instrumentation (csv)" name="instrumentation" defaultValue={arr(p.instrumentation)} />
          <Field label="Mix aesthetic" name="mixAesthetic" defaultValue={p.mixAesthetic ?? ""} />

          <h2 className="font-medium pt-4">Visual DNA</h2>
          <Field label="Color palette (csv hex)" name="colorPalette" defaultValue={arr(p.colorPalette)} />
          <Field label="Visual refs (csv urls)" name="visualRefs" defaultValue={arr(p.visualRefs)} />
          <Field label="Image prompt template" name="imagePromptTemplate" textarea defaultValue={p.imagePromptTemplate ?? ""} />

          <h2 className="font-medium pt-4">Voice & language</h2>
          <Field label="Slang (csv)" name="slang" defaultValue={arr(p.slang)} />
          <Field label="Motifs (csv)" name="motifs" defaultValue={arr(p.motifs)} />
          <Field label="Forbidden words (csv)" name="forbiddenWords" defaultValue={arr(p.forbiddenWords)} />

          <h2 className="font-medium pt-4">Persona Core (override)</h2>
          <Field
            label="Locked block injected into every prompt — leave empty to auto-build"
            name="personaCore"
            textarea
            defaultValue={p.personaCore ?? ""}
          />

          <label className="flex items-center gap-3 pt-3">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={p.isPublic}
              className="size-4 accent-[color:var(--color-accent)]"
            />
            <span className="text-sm">
              Public portfolio at{" "}
              <a
                className="font-mono text-[color:var(--color-accent)] hover:underline"
                href={`/p/${p.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                /p/{p.slug}
              </a>
            </span>
          </label>
          <button className="btn">Save</button>
        </form>

        <div className="space-y-6">
          <PromptForge personaId={p.id} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} className="input" rows={3} />
      ) : (
        <input name={name} defaultValue={defaultValue} className="input" />
      )}
    </label>
  );
}
