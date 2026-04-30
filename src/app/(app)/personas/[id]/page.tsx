import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  Pencil,
  Globe2,
  Lock,
  Share2,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { requireUserId } from "@/lib/require-auth";
import { db } from "@/db";
import { personas, albums, tracks } from "@/db/schema";
import { updatePersona, deletePersona, clonePersona } from "../actions";
import { PersonaTabs } from "./persona-tabs";
import PromptForge from "./prompt-forge";
import LyricSeeder from "./lyric-seeder";
import { DeleteButton } from "@/components/delete-button";
import { RegenerateCoreButton } from "./regenerate-core-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { staticSunoPrompt } from "@/lib/persona-prompt";

export default async function PersonaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const userId = await requireUserId();
  const [p] = await db
    .select()
    .from(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
  if (!p) notFound();

  const albumRows = await db
    .select()
    .from(albums)
    .where(eq(albums.personaId, id))
    .orderBy(asc(albums.orderIndex), asc(albums.createdAt));
  const [{ trackCount }] = await db
    .select({ trackCount: sql<number>`count(*)::int` })
    .from(tracks)
    .where(eq(tracks.personaId, id));

  return (
    <div className="max-w-4xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: p.name },
        ]}
      />
      <PersonaTabs personaId={id} active="studio" />
      {edit ? (
        <EditMode persona={p} />
      ) : (
        <ProfileView
          persona={p}
          albums={albumRows.map((a) => ({
            id: a.id,
            title: a.title,
            coverUrl: a.coverUrl,
          }))}
          trackCount={trackCount}
        />
      )}
    </div>
  );
}

/* Profile (StudioWorks-style read-first view) */

function ProfileView({
  persona: p,
  albums,
  trackCount,
}: {
  persona: typeof personas.$inferSelect;
  albums: { id: string; title: string; coverUrl: string | null }[];
  trackCount: number;
}) {
  const personality = (p.personality ?? []) as string[];
  const genres = (p.genres ?? []) as string[];
  const motifs = (p.motifs ?? []) as string[];
  const instrumentation = (p.instrumentation ?? []) as string[];
  const palette = (p.colorPalette ?? []) as string[];
  const social = (p.socialLinks ?? []) as { label: string; url: string }[];

  const dnaFields = [
    { filled: genres.length > 0 || !!p.mixAesthetic },
    { filled: instrumentation.length > 0 },
    { filled: !!(p.bpmMin && p.bpmMax) },
    { filled: !!p.keyTendencies },
    { filled: !!p.lyricalTone },
    { filled: motifs.length > 0 },
    { filled: !!p.visualAesthetic || !!p.imagePromptTemplate },
    { filled: !!p.themes },
    { filled: !!p.targetAudience },
  ];
  const filled = dnaFields.filter((f) => f.filled).length;

  const sunoPrompt = staticSunoPrompt(p);

  return (
    <>
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
              {p.name}
            </h1>
            {p.tagline && (
              <p className="text-[color:var(--color-muted)] mt-1 text-sm sm:text-base">
                {p.tagline}
              </p>
            )}
            {(genres.length > 0 || personality.length > 0 || p.vocalStyle) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {genres.map((g) => (
                  <Pill key={g} tone="accent">
                    {g}
                  </Pill>
                ))}
                {personality.map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
                {p.vocalStyle && <Pill>{p.vocalStyle}</Pill>}
              </div>
            )}
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto sm:shrink-0">
            <Link
              href={`/personas/${p.id}/albums`}
              className="btn gap-2 justify-center w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Create Album
            </Link>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <Link
                href={`/personas/${p.id}?edit=1`}
                className="btn-ghost btn gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit details
              </Link>
              <Link
                href={`/api/personas/${p.id}/export`}
                className="btn-ghost btn gap-1.5"
              >
                Export JSON
              </Link>
              <span className="text-[color:var(--color-muted)] font-mono truncate">
                {p.slug}
              </span>
            </div>
          </div>
        </div>
      </header>

      {filled < 4 && (
        <div className="mb-6 rounded-xl border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/8 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-[color:var(--color-accent)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-medium">Your artist needs more DNA</div>
              <p className="text-[color:var(--color-muted)] mt-0.5">
                Lyrics and prompts get sharper the more you fill in. Click{" "}
                <Link
                  href={`/personas/${p.id}?edit=1`}
                  className="underline text-[color:var(--color-accent)]"
                >
                  Edit details
                </Link>{" "}
                to fill the missing fields, or regenerate the persona core below.
              </p>
            </div>
          </div>
        </div>
      )}

      {p.bio && (
        <Section title="Bio">
          <p className="leading-relaxed whitespace-pre-wrap">{p.bio}</p>
        </Section>
      )}

      <Section
        title="Artist DNA Profile"
        right={
          <span
            className={`text-xs font-medium px-2 py-1 rounded-md ${
              filled === 9
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : filled >= 5
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            {filled}/9 fields
          </span>
        }
      >
        <div className="grid gap-4">
          <DnaRow label="Sonic Identity">
            {p.mixAesthetic || (genres.length > 0 ? genres.join(", ") : null)}
          </DnaRow>
          <DnaRow label="Instrumentation">
            {instrumentation.length > 0 ? instrumentation.join(", ") : null}
          </DnaRow>
          <DnaRow label="BPM Range">
            {p.bpmMin && p.bpmMax ? `${p.bpmMin}–${p.bpmMax}` : null}
          </DnaRow>
          <DnaRow label="Key Tendencies">{p.keyTendencies}</DnaRow>
          <DnaRow label="Lyrical Tone">{p.lyricalTone}</DnaRow>
          <DnaRow label="Vocabulary Themes">
            {motifs.length > 0 ? motifs.join(", ") : null}
          </DnaRow>
          <DnaRow label="Visual Aesthetic">
            <>
              {p.visualAesthetic || p.imagePromptTemplate}
              {palette.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {palette.map((c) => (
                    <span
                      key={c}
                      title={c}
                      className="h-5 w-5 rounded border border-[color:var(--color-border)]"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              )}
            </>
          </DnaRow>
          <DnaRow label="Themes">{p.themes}</DnaRow>
          <DnaRow label="Target Audience">{p.targetAudience}</DnaRow>
        </div>
      </Section>

      <Section title="Social Links">
        {social.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            No social links added yet.{" "}
            <Link
              href={`/personas/${p.id}?edit=1`}
              className="underline hover:text-[color:var(--color-accent)]"
            >
              Add one
            </Link>
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {social.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost btn text-xs"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="AI Music Generator Prompt"
        right={<CopyButton text={sunoPrompt} />}
      >
        <pre className="whitespace-pre-wrap font-mono text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg p-3 leading-relaxed">
          {sunoPrompt}
        </pre>
        <p className="text-xs text-[color:var(--color-muted)] mt-2">
          Use this prompt in Suno, Udio, or any AI music generator. For
          per-track variations, open the{" "}
          <Link
            href={`/personas/${p.id}/tracks`}
            className="underline hover:text-[color:var(--color-accent)]"
          >
            Tracks
          </Link>{" "}
          tab.
        </p>
      </Section>

      <Section
        title={`Albums (${albums.length})`}
        right={
          <Link
            href={`/personas/${p.id}/albums`}
            className="btn-ghost btn text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Album
          </Link>
        }
      >
        {albums.length === 0 ? (
          <div className="text-sm text-[color:var(--color-muted)] py-2">
            No albums yet.{" "}
            <Link
              href={`/personas/${p.id}/albums`}
              className="underline hover:text-[color:var(--color-accent)]"
            >
              Create one
            </Link>{" "}
            to start grouping tracks.
            {trackCount > 0 && (
              <>
                {" "}
                Or jump into the {trackCount} loose track
                {trackCount === 1 ? "" : "s"}.
              </>
            )}
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {albums.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/personas/${p.id}/albums/${a.id}`}
                  className="card flex items-center gap-3 hover:border-[color:var(--color-accent)] py-3"
                >
                  <div className="h-10 w-10 rounded-md bg-[color:var(--color-bg)] flex items-center justify-center text-xs font-mono text-[color:var(--color-muted)] shrink-0 overflow-hidden">
                    {a.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.coverUrl}
                        alt={a.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      a.title.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="font-medium truncate">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Share"
        right={
          p.isPublic ? (
            <Globe2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <Lock className="h-4 w-4 text-[color:var(--color-muted)]" />
          )
        }
      >
        <form action={updatePersona.bind(null, p.id)} className="space-y-3">
          <PreserveFields persona={p} />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={p.isPublic}
              className="size-4 accent-[color:var(--color-accent)]"
            />
            <span className="text-sm">
              Make profile public at{" "}
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
          <div className="flex items-center gap-2">
            <SubmitButton className="btn gap-1.5">
              <Share2 className="h-4 w-4" />
              Save sharing
            </SubmitButton>
            {p.isPublic && (
              <CopyButton
                text={`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/p/${p.slug}`}
                label="Copy public URL"
              />
            )}
          </div>
        </form>
      </Section>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <LyricSeeder personaId={p.id} />
        <PromptForge personaId={p.id} />
      </div>

      <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-[color:var(--color-border)]">
        <form
          action={async () => {
            "use server";
            await clonePersona(p.id);
          }}
        >
          <SubmitButton className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)] underline bg-transparent border-0 p-0">
            Duplicate persona
          </SubmitButton>
        </form>
        <DeleteButton
          action={async () => {
            "use server";
            await deletePersona(p.id);
          }}
          label="Delete persona"
          confirm={`Permanently delete "${p.name}"? All albums, tracks, and lyric versions will be removed. This cannot be undone.`}
        />
      </div>
    </>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function DnaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const empty =
    !children || (typeof children === "string" && !children.trim());
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-start">
      <div className="text-sm font-medium text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="text-sm">
        {empty ? (
          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--color-muted)] italic">
            <AlertCircle className="h-3 w-3" /> not set
          </span>
        ) : (
          <>
            {children}
            <CheckCircle2 className="inline h-3 w-3 text-emerald-400 ml-2 align-middle" />
          </>
        )}
      </div>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "accent";
}) {
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-1 rounded-md border ${
        tone === "accent"
          ? "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg)]"
      }`}
    >
      {children}
    </span>
  );
}

function PreserveFields({
  persona: p,
}: {
  persona: typeof personas.$inferSelect;
}) {
  const csv = (a: string[] | null | undefined) => (a ?? []).join(", ");
  return (
    <>
      <input type="hidden" name="name" value={p.name} />
      <input type="hidden" name="tagline" value={p.tagline ?? ""} />
      <input type="hidden" name="bio" value={p.bio ?? ""} />
      <input type="hidden" name="genres" value={csv(p.genres)} />
      <input type="hidden" name="bpmMin" value={p.bpmMin ?? ""} />
      <input type="hidden" name="bpmMax" value={p.bpmMax ?? ""} />
      <input type="hidden" name="vocalStyle" value={p.vocalStyle ?? ""} />
      <input
        type="hidden"
        name="instrumentation"
        value={csv(p.instrumentation)}
      />
      <input type="hidden" name="mixAesthetic" value={p.mixAesthetic ?? ""} />
      <input type="hidden" name="colorPalette" value={csv(p.colorPalette)} />
      <input type="hidden" name="visualRefs" value={csv(p.visualRefs)} />
      <input
        type="hidden"
        name="imagePromptTemplate"
        value={p.imagePromptTemplate ?? ""}
      />
      <input type="hidden" name="slang" value={csv(p.slang)} />
      <input type="hidden" name="motifs" value={csv(p.motifs)} />
      <input
        type="hidden"
        name="forbiddenWords"
        value={csv(p.forbiddenWords)}
      />
      <input type="hidden" name="influences" value={csv(p.influences)} />
      <input type="hidden" name="personality" value={csv(p.personality)} />
      <input type="hidden" name="keyTendencies" value={p.keyTendencies ?? ""} />
      <input type="hidden" name="lyricalTone" value={p.lyricalTone ?? ""} />
      <input
        type="hidden"
        name="visualAesthetic"
        value={p.visualAesthetic ?? ""}
      />
      <input type="hidden" name="themes" value={p.themes ?? ""} />
      <input
        type="hidden"
        name="targetAudience"
        value={p.targetAudience ?? ""}
      />
      <input type="hidden" name="personaCore" value={p.personaCore ?? ""} />
    </>
  );
}

/* Edit mode (?edit=1) */

function EditMode({ persona: p }: { persona: typeof personas.$inferSelect }) {
  const arr = (a: string[] | null | undefined) => (a ?? []).join(", ");
  return (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {p.name}
        </h1>
        <Link
          href={`/personas/${p.id}`}
          className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)] underline"
        >
          ← Back to profile
        </Link>
      </div>

      <form action={updatePersona.bind(null, p.id)} className="card space-y-3">
        <h2 className="font-medium mb-2">Identity</h2>
        <Field label="Name" name="name" defaultValue={p.name} />
        <Field label="Tagline" name="tagline" defaultValue={p.tagline ?? ""} />
        <Field label="Bio" name="bio" textarea defaultValue={p.bio ?? ""} />
        <Field
          label="Personality (csv)"
          name="personality"
          defaultValue={arr(p.personality)}
          placeholder="Mischievous, Hyperactive, Electric"
        />
        <Field
          label="Influences (csv)"
          name="influences"
          defaultValue={arr(p.influences)}
        />

        <h2 className="font-medium pt-4">Sonic DNA</h2>
        <Field label="Genres (csv)" name="genres" defaultValue={arr(p.genres)} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="BPM min"
            name="bpmMin"
            type="number"
            min={20}
            max={400}
            defaultValue={p.bpmMin?.toString() ?? ""}
          />
          <Field
            label="BPM max"
            name="bpmMax"
            type="number"
            min={20}
            max={400}
            defaultValue={p.bpmMax?.toString() ?? ""}
          />
        </div>
        <Field
          label="Key tendencies"
          name="keyTendencies"
          defaultValue={p.keyTendencies ?? ""}
          placeholder="C minor, F# minor"
        />
        <Field
          label="Vocal style"
          name="vocalStyle"
          defaultValue={p.vocalStyle ?? ""}
        />
        <Field
          label="Instrumentation (csv)"
          name="instrumentation"
          defaultValue={arr(p.instrumentation)}
        />
        <Field
          label="Mix aesthetic"
          name="mixAesthetic"
          defaultValue={p.mixAesthetic ?? ""}
        />
        <Field
          label="Lyrical tone"
          name="lyricalTone"
          defaultValue={p.lyricalTone ?? ""}
          placeholder="saccharine but subtly nihilistic"
        />

        <h2 className="font-medium pt-4">Visual DNA</h2>
        <Field
          label="Visual aesthetic"
          name="visualAesthetic"
          textarea
          defaultValue={p.visualAesthetic ?? ""}
        />
        <Field
          label="Color palette (csv hex)"
          name="colorPalette"
          defaultValue={arr(p.colorPalette)}
        />
        <Field
          label="Visual refs (csv urls)"
          name="visualRefs"
          defaultValue={arr(p.visualRefs)}
        />
        <Field
          label="Image prompt template"
          name="imagePromptTemplate"
          textarea
          defaultValue={p.imagePromptTemplate ?? ""}
        />

        <h2 className="font-medium pt-4">Voice & language</h2>
        <Field
          label="Vocabulary themes / motifs (csv)"
          name="motifs"
          defaultValue={arr(p.motifs)}
        />
        <Field label="Slang (csv)" name="slang" defaultValue={arr(p.slang)} />
        <Field
          label="Forbidden words (csv)"
          name="forbiddenWords"
          defaultValue={arr(p.forbiddenWords)}
        />

        <h2 className="font-medium pt-4">Story</h2>
        <Field
          label="Themes"
          name="themes"
          defaultValue={p.themes ?? ""}
          placeholder="digital escapism, candy-coated chaos"
        />
        <Field
          label="Target audience"
          name="targetAudience"
          defaultValue={p.targetAudience ?? ""}
        />

        <h2 className="font-medium pt-4">Persona Core (override)</h2>
        <Field
          label="Locked block injected into every prompt — leave empty to auto-build"
          name="personaCore"
          textarea
          defaultValue={p.personaCore ?? ""}
        />
        <div className="flex justify-end">
          <RegenerateCoreButton personaId={p.id} />
        </div>
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
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/personas/${p.id}`}
            className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          >
            Cancel
          </Link>
          <SubmitButton className="btn">Save changes</SubmitButton>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  textarea,
  type,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  textarea?: boolean;
  type?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          className="input"
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="input"
          type={type}
          min={min}
          max={max}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
