"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  suggestPersonaDetails,
  type PersonaDetailAssistantState,
  type PersonaDetailDraft,
} from "../actions";

const DETAIL_FIELDS = [
  "tagline",
  "bio",
  "genres",
  "bpmMin",
  "bpmMax",
  "vocalStyle",
  "instrumentation",
  "mixAesthetic",
  "colorPalette",
  "visualRefs",
  "imagePromptTemplate",
  "slang",
  "motifs",
  "forbiddenWords",
  "influences",
  "personality",
  "keyTendencies",
  "lyricalTone",
  "visualAesthetic",
  "themes",
  "targetAudience",
] as const;

const FIELD_LABELS: Record<(typeof DETAIL_FIELDS)[number], string> = {
  tagline: "Tagline",
  bio: "Bio",
  genres: "Genres",
  bpmMin: "BPM min",
  bpmMax: "BPM max",
  vocalStyle: "Vocal style",
  instrumentation: "Instrumentation",
  mixAesthetic: "Mix aesthetic",
  colorPalette: "Color palette",
  visualRefs: "Visual refs",
  imagePromptTemplate: "Image prompt",
  slang: "Slang",
  motifs: "Motifs",
  forbiddenWords: "Forbidden words",
  influences: "Influences",
  personality: "Personality",
  keyTendencies: "Key tendencies",
  lyricalTone: "Lyrical tone",
  visualAesthetic: "Visual aesthetic",
  themes: "Themes",
  targetAudience: "Target audience",
};

export function ArtistDetailAssistant({
  personaId,
  artistName,
}: {
  personaId: string;
  artistName: string;
}) {
  const [direction, setDirection] = useState("");
  const [state, setState] = useState<PersonaDetailAssistantState | null>(null);
  const [pending, startTransition] = useTransition();

  const filledCount = useMemo(() => {
    if (!state?.ok) return 0;
    return DETAIL_FIELDS.filter((field) => String(state.suggestions[field] ?? "").trim()).length;
  }, [state]);

  function getForm() {
    return document.querySelector<HTMLFormElement>('form[data-persona-form="true"]');
  }

  function collectCurrentValues(): PersonaDetailDraft {
    const form = getForm();
    if (!form) return {};
    const formData = new FormData(form);
    const values: PersonaDetailDraft = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("$ACTION_")) continue;
      values[key as keyof PersonaDetailDraft] = String(value);
    }
    return values;
  }

  function generate() {
    startTransition(async () => {
      const result = await suggestPersonaDetails(
        personaId,
        collectCurrentValues(),
        direction,
      );
      setState(result);
      if (result.ok) {
        toast.success("Artist details drafted");
      } else {
        toast.error(result.error);
      }
    });
  }

  function apply(mode: "empty" | "replace") {
    if (!state?.ok) return;
    const form = getForm();
    if (!form) {
      toast.error("Open the artist edit form first");
      return;
    }

    let applied = 0;
    for (const field of DETAIL_FIELDS) {
      const value = String(state.suggestions[field] ?? "").trim();
      if (!value) continue;

      const input = form.elements.namedItem(field) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!input) continue;
      if (mode === "empty" && input.value.trim()) continue;

      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      applied += 1;
    }

    toast.success(
      applied === 0
        ? "No empty fields changed"
        : `${applied} field${applied === 1 ? "" : "s"} filled. Review and save.`,
    );
  }

  return (
    <section className="card space-y-4 border-[color:var(--color-accent)]/25">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/10 p-2 text-[color:var(--color-accent)]">
          <Wand2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">AI detail assistant</h2>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Tell the assistant where {artistName} should go. It will draft the
            missing artist DNA, visual identity, language rules, and audience
            details for you to review before saving.
          </p>
        </div>
      </div>

      <textarea
        value={direction}
        onChange={(event) => setDirection(event.target.value)}
        rows={3}
        maxLength={800}
        className="input resize-none"
        placeholder="e.g. Make this artist feel like a nocturnal hyperpop producer with ghostly vocals, chrome visuals, and sharp club-ready hooks."
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="btn gap-2"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Drafting details
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Draft artist details
            </>
          )}
        </button>
        {state?.ok && (
          <span className="text-xs text-[color:var(--color-muted)]">
            {filledCount}/{DETAIL_FIELDS.length} fields suggested
          </span>
        )}
      </div>

      {state?.ok && (
        <div className="space-y-3 border-t border-[color:var(--color-border)] pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {DETAIL_FIELDS.map((field) => {
              const value = String(state.suggestions[field] ?? "").trim();
              if (!value) return null;
              return (
                <div
                  key={field}
                  className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3"
                >
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted)]">
                    <Check className="h-3 w-3 text-emerald-400" />
                    {FIELD_LABELS[field]}
                  </div>
                  <div className="line-clamp-4 text-sm leading-relaxed">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => apply("empty")} className="btn">
              Fill empty fields
            </button>
            <button
              type="button"
              onClick={() => apply("replace")}
              className="btn-ghost btn"
            >
              Replace form fields
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
