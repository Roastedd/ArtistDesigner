"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  label = "Delete",
  confirm = "Are you sure? This cannot be undone.",
  className = "text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors",
}: {
  action: () => Promise<void>;
  label?: string;
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className + (pending ? " opacity-50" : "")}
      onClick={() => {
        if (window.confirm(confirm)) start(() => action());
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}
