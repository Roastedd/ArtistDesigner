"use client";

import { useTransition } from "react";
import { toast } from "sonner";

export function DeleteButton({
  action,
  label = "Delete",
  confirm = "Are you sure? This cannot be undone.",
  successMessage,
  className = "text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors",
}: {
  action: () => Promise<void>;
  label?: string;
  confirm?: string;
  /** Toast shown after a successful delete. Defaults to "Deleted". */
  successMessage?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className + (pending ? " opacity-50" : "")}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        start(async () => {
          try {
            await action();
            toast.success(successMessage ?? "Deleted");
          } catch (e) {
            // NEXT_REDIRECT is thrown intentionally by server actions that
            // call redirect() — the navigation succeeds and is not an error.
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("NEXT_REDIRECT")) return;
            toast.error(msg || "Delete failed");
          }
        });
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}
