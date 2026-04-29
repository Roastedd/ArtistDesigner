"use client";

import { useTransition } from "react";
import { regeneratePersonaCore } from "../actions";

export function RegenerateCoreButton({ personaId }: { personaId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(
            "Auto-build the Persona Core from this artist's current fields? Existing core text will be replaced.",
          )
        ) {
          start(async () => {
            try {
              await regeneratePersonaCore(personaId);
            } catch (e) {
              window.alert(
                e instanceof Error ? e.message : "Failed to regenerate.",
              );
            }
          });
        }
      }}
      className={
        "text-xs px-2 py-1 rounded border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] " +
        (pending ? "opacity-60 cursor-wait" : "")
      }
      title="Use AI to write the locked Persona Core block"
    >
      {pending ? "Building…" : "✨ Auto-build core"}
    </button>
  );
}
