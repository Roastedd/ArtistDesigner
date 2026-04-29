"use client";

import { useState, useTransition } from "react";
import { reorderEras } from "./actions";

export function EraReorderControls({
  personaId,
  ids,
}: {
  personaId: string;
  ids: string[];
}) {
  const [order, setOrder] = useState(ids);
  const [pending, startTransition] = useTransition();

  if (order.length < 2) return null;

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
    startTransition(async () => {
      await reorderEras(personaId, next);
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs text-[color:var(--color-muted)]">
      {order.map((id, idx) => (
        <span key={id} className="hidden">
          {id}
          {idx}
        </span>
      ))}
      <span>{pending ? "Saving order…" : `Reorder via ↑↓ on each era`}</span>
    </div>
  );
}

export function EraOrderButtons({
  personaId,
  eraId,
  allIds,
}: {
  personaId: string;
  eraId: string;
  allIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const idx = allIds.indexOf(eraId);
  const isFirst = idx <= 0;
  const isLast = idx === allIds.length - 1;

  function move(dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= allIds.length) return;
    const next = allIds.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    startTransition(async () => {
      await reorderEras(personaId, next);
    });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={isFirst || pending}
        className="text-xs px-1 leading-none text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)] disabled:opacity-30"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={isLast || pending}
        className="text-xs px-1 leading-none text-[color:var(--color-muted)] hover:text-[color:var(--color-accent)] disabled:opacity-30"
        aria-label="Move down"
      >
        ↓
      </button>
    </div>
  );
}
