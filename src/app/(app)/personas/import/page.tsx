import { Breadcrumbs } from "@/components/breadcrumbs";
import { importPersona } from "../actions";
import { requireUserId } from "@/lib/require-auth";

export default async function ImportPage() {
  await requireUserId();
  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Personas", href: "/personas" },
          { label: "Import" },
        ]}
      />
      <h1 className="text-2xl font-semibold mb-2">Import persona</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-6">
        Paste a JSON file exported from{" "}
        <code className="font-mono text-xs px-1 py-0.5 rounded bg-[color:var(--color-bg-elev)]">
          /api/personas/[id]/export
        </code>
        . A new private persona will be created with all eras, albums, tracks,
        prompt &amp; lyric versions, and releases.
      </p>

      <form action={importPersona} className="card space-y-3">
        <label className="block">
          <div className="label mb-1">Exported JSON</div>
          <textarea
            name="payload"
            required
            rows={16}
            className="input font-mono text-xs"
            placeholder='{ "version": 1, "persona": { "name": "…" }, "eras": [], "albums": [], "tracks": [], "promptVersions": [], "lyricVersions": [], "releases": [] }'
          />
        </label>
        <button className="btn">Import persona</button>
      </form>
    </div>
  );
}
