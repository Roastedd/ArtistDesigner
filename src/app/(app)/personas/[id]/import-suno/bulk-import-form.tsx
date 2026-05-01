"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkImportClips } from "../../suno-capture-actions";

export function BulkImportForm({ personaId }: { personaId: string }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [pinAll, setPinAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; imported: number; total: number; errors: string[] }
    | { ok: false; error: string }
    | null
  >(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await bulkImportClips({
        personaId,
        source: "suno",
        raw,
        pinAll,
      });
      setResult(r);
      if (r.ok && r.imported > 0) {
        setRaw("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={18}
        placeholder="Paste blocks separated by ---"
        className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 font-mono text-xs"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinAll}
            onChange={(e) => setPinAll(e.target.checked)}
          />
          Pin every clip as an exemplar
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={busy || raw.trim().length < 10}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-fg)] disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Import clips
        </button>
      </div>

      {result && !result.ok && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {result.error}
        </p>
      )}
      {result && result.ok && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <p className="font-medium">
            Imported {result.imported} of {result.total} clip
            {result.total === 1 ? "" : "s"}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-200">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
