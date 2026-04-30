"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePreferences } from "./actions";

const SWATCHES = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#f87171"];
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function PreferencesForm({
  initialTheme,
  initialAccent,
}: {
  initialTheme: string;
  initialAccent: string | null;
}) {
  const [theme, setTheme] = useState<string>(initialTheme);
  const [accent, setAccent] = useState<string>(initialAccent ?? "");
  const [pending, start] = useTransition();

  const accentValid = accent === "" || HEX_RE.test(accent);

  return (
    <form
      action={(fd) => {
        // Ensure controlled values are submitted regardless of form state.
        fd.set("theme", theme);
        fd.set("accentColor", accent);
        start(async () => {
          try {
            await updatePreferences(fd);
            toast.success("Preferences saved");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Save failed");
          }
        });
      }}
      className="card space-y-5"
    >
      <div>
        <div className="label mb-2">Theme</div>
        <div className="flex gap-3">
          {["dark", "light"].map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={() => setTheme(t)}
              />
              <span className="capitalize text-sm">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-2">Accent color</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {SWATCHES.map((c) => {
            const active = accent.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                aria-label={`Use accent ${c}`}
                aria-pressed={active}
                onClick={() => setAccent(c)}
                className={
                  "w-8 h-8 rounded-full border-2 transition-transform " +
                  (active
                    ? "border-[color:var(--color-fg)] scale-110"
                    : "border-[color:var(--color-border)] hover:scale-105")
                }
                style={{ background: c }}
                title={c}
              />
            );
          })}
          {accent && (
            <button
              type="button"
              onClick={() => setAccent("")}
              className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] underline"
            >
              Reset
            </button>
          )}
        </div>
        <input
          name="accentColor"
          type="text"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          placeholder="#a78bfa"
          className="input font-mono text-sm"
          aria-invalid={!accentValid}
        />
        <div className="text-xs text-[color:var(--color-muted)] mt-1">
          {accentValid
            ? "Hex value. Leave blank for the default purple."
            : "Must be a valid hex color (e.g. #a78bfa)."}
        </div>
      </div>

      {/* Live preview */}
      <div
        className="rounded-md border border-[color:var(--color-border)] p-3 flex items-center gap-3"
        style={
          accent && accentValid
            ? ({ ["--color-accent" as string]: accent } as React.CSSProperties)
            : undefined
        }
      >
        <span
          className="h-8 w-8 rounded-md"
          style={{ background: "var(--color-accent)" }}
        />
        <span className="text-xs text-[color:var(--color-muted)]">
          Live preview — saved on submit.
        </span>
      </div>

      <button
        type="submit"
        className="btn"
        disabled={pending || !accentValid}
      >
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
