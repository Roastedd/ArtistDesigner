"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, ExternalLink } from "lucide-react";
import { updateProducerName } from "./actions";

export function ProducerNameCard({
  initialName,
  email,
  profileSlug,
}: {
  initialName: string | null;
  email: string;
  profileSlug?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName ?? "");
  const [pending, startTransition] = useTransition();

  const display = initialName?.trim() || email.split("@")[0];

  function save() {
    const fd = new FormData();
    fd.set("producerName", value);
    startTransition(async () => {
      await updateProducerName(fd);
      setEditing(false);
    });
  }

  return (
    <section className="card">
      <div className="label mb-2">Producer Name</div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setValue(initialName ?? "");
                setEditing(false);
              }
            }}
            placeholder="Your producer name"
            maxLength={60}
            className="input flex-1 text-lg font-semibold"
          />
          <button
            onClick={save}
            disabled={pending}
            aria-label="Save"
            className="p-1.5 rounded-md text-[color:var(--color-accent)] hover:bg-[color:var(--color-bg)] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setValue(initialName ?? "");
              setEditing(false);
            }}
            aria-label="Cancel"
            className="p-1.5 rounded-md text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{display}</span>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit producer name"
            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {profileSlug && (
            <a
              href={`/p/${profileSlug}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-sm text-[color:var(--color-accent)] hover:opacity-80"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Profile
            </a>
          )}
        </div>
      )}
    </section>
  );
}
