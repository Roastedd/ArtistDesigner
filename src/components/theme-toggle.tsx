"use client";

import { useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { setTheme } from "@/app/(app)/settings/actions";

/**
 * One-click light/dark toggle. Uses an optimistic data-theme update on
 * `document.documentElement` so the UI flips immediately, then persists
 * the choice via a server action.
 */
export function ThemeToggle({ current }: { current: string }) {
  const [pending, start] = useTransition();
  const isDark = current !== "light";
  const next = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      disabled={pending}
      onClick={() => {
        // Optimistic flip on the closest [data-theme] container so the
        // change feels instant before the server round-trip completes.
        const root =
          document.querySelector<HTMLElement>("[data-theme]") ??
          document.documentElement;
        root.setAttribute("data-theme", next);
        start(() => setTheme(next));
      }}
      className="p-1.5 rounded-md text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-elev)] transition-colors disabled:opacity-50"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
