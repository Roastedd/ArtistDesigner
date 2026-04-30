"use client";

import { useTransition } from "react";
import { quickUpdateTrackStatus } from "../albums/actions";

const STATUSES = ["idea", "prompt", "lyrics", "demo", "master", "released"] as const;

const STATUS_COLORS: Record<string, string> = {
  idea: "#6b7280",
  prompt: "#a78bfa",
  lyrics: "#60a5fa",
  demo: "#fbbf24",
  master: "#34d399",
  released: "#22d3ee",
};

export function StatusSelect({
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
        start(() => quickUpdateTrackStatus(personaId, trackId, next));
      }}
      className="text-xs px-2 py-0.5 rounded-full border bg-transparent cursor-pointer"
      style={{
        color: STATUS_COLORS[value],
        borderColor: STATUS_COLORS[value],
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg)]">
          {s}
        </option>
      ))}
    </select>
  );
}
