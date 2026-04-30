"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disc3, Music2, Search, X } from "lucide-react";

type Persona = { id: string; name: string };
type Mode = "ai" | "manual";
type Kind = "album" | "track";

/**
 * Modal launched from /library/{albums,tracks}?new=ai|manual when the user
 * owns more than one artist. Routes them to the persona-level create flow.
 *
 * For `kind="album"` we send users to the per-persona Albums page (which
 * already has the "New album" form).
 * For `kind="track"` we send them to the per-persona Tracks page (quick add).
 */
export function PersonaPickerModal({
  personas,
  kind,
  mode,
}: {
  personas: Persona[];
  kind: Kind;
  mode: Mode;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return personas;
    return personas.filter((p) => p.name.toLowerCase().includes(term));
  }, [q, personas]);

  function close() {
    // Strip the ?new= param so the modal doesn't reopen on back/forward.
    const here = window.location.pathname;
    router.replace(here);
  }

  function hrefFor(p: Persona) {
    const base =
      kind === "album" ? `/personas/${p.id}/albums` : `/personas/${p.id}/tracks`;
    // Pass the mode through; persona pages can decide what to do with it later.
    // For now both pages already render their own create forms.
    return mode === "ai" ? `${base}?ai=1` : base;
  }

  const Icon = kind === "album" ? Disc3 : Music2;
  const verb =
    mode === "ai"
      ? kind === "album"
        ? "Generate album"
        : "Generate track"
      : kind === "album"
        ? "Build album"
        : "Add track";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${verb} — pick artist`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-overlay-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md bg-[color:var(--color-bg-elev)] border border-[color:var(--color-border)] rounded-xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
            <h2 className="font-semibold text-sm">{verb}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="p-1 rounded hover:bg-[color:var(--color-bg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[color:var(--color-border)]">
          <label className="relative block">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search artists…"
              className="input pl-8 text-sm"
            />
          </label>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            Pick an artist to add this {kind} to.
          </p>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-[color:var(--color-border)]">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[color:var(--color-muted)]">
              No artists match {q ? `"${q}"` : "that"}.
            </li>
          )}
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={hrefFor(p)}
                className="block px-4 py-2.5 text-sm hover:bg-[color:var(--color-bg)] transition-colors"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="px-4 py-3 border-t border-[color:var(--color-border)] flex items-center justify-between">
          <Link
            href="/personas/new"
            className="text-xs text-[color:var(--color-accent)] hover:underline"
          >
            + New artist
          </Link>
          <button
            type="button"
            onClick={close}
            className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
