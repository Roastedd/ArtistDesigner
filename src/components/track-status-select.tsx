"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { quickUpdateTrackStatus } from "@/app/(app)/personas/[id]/albums/actions";

const STATUSES = ["idea", "prompt", "lyrics", "demo", "master", "released"] as const;

const STATUS_COLORS: Record<string, string> = {
  idea: "#6b7280",
  prompt: "#a78bfa",
  lyrics: "#60a5fa",
  demo: "#fbbf24",
  master: "#34d399",
  released: "#22d3ee",
};

/** Inline status pill that updates the track via server action. */
export function TrackStatusSelect({
  personaId,
  trackId,
  value,
}: {
  personaId: string;
  trackId: string;
  value: string;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.currentTarget.value;
        start(async () => {
          try {
            await quickUpdateTrackStatus(personaId, trackId, next);
            toast.success(`Marked ${next}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
          }
        });
      }}
      className="text-xs px-2 py-0.5 rounded-full border bg-transparent cursor-pointer capitalize"
      style={{
        color: STATUS_COLORS[value],
        borderColor: STATUS_COLORS[value],
      }}
    >
      {STATUSES.map((s) => (
        <option
          key={s}
          value={s}
          className="bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg)]"
        >
          {s}
        </option>
      ))}
    </select>
  );
}
