"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  analyzeLyricsForPersona,
  type LyricDnaSuggestions,
} from "../actions";

export default function LyricSeeder({ personaId }: { personaId: string }) {
  const [open, setOpen] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [suggestions, setSuggestions] = useState<LyricDnaSuggestions | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function analyze() {
    startTransition(async () => {
      const result = await analyzeLyricsForPersona(personaId, lyrics);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSuggestions(result.suggestions!);
      toast.success("Analysis complete — review suggestions below");
    });
  }

  function apply() {
    if (!suggestions) return;
    // Dispatch a custom event that the persona form listens to.
    // Simpler than prop-drilling: we directly fill the form fields by name.
    const form = document.querySelector<HTMLFormElement>(
      'form[data-persona-form]',
    );
    if (!form) {
      toast.error("Could not find persona form");
      return;
    }
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (el) el.value = value;
    };
    if (suggestions.tagline) set("tagline", suggestions.tagline);
    if (suggestions.bio) set("bio", suggestions.bio);
    if (suggestions.genres?.length)
      set("genres", suggestions.genres.join(", "));
    if (suggestions.bpmMin) set("bpmMin", String(suggestions.bpmMin));
    if (suggestions.bpmMax) set("bpmMax", String(suggestions.bpmMax));
    if (suggestions.vocalStyle) set("vocalStyle", suggestions.vocalStyle);
    if (suggestions.instrumentation?.length)
      set("instrumentation", suggestions.instrumentation.join(", "));
    if (suggestions.mixAesthetic) set("mixAesthetic", suggestions.mixAesthetic);
    if (suggestions.slang?.length) set("slang", suggestions.slang.join(", "));
    if (suggestions.motifs?.length)
      set("motifs", suggestions.motifs.join(", "));
    if (suggestions.influences?.length)
      set("influences", suggestions.influences.join(", "));
    toast.success("Fields pre-filled — review and save");
    setSuggestions(null);
    setOpen(false);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Seed from existing lyrics</h2>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setSuggestions(null);
          }}
          className="btn-ghost btn text-xs"
        >
          {open ? "Close" : "Paste a song →"}
        </button>
      </div>

      {open && (
        <>
          <p className="text-xs text-[color:var(--color-muted)]">
            Paste the lyrics of a song that represents this artist&apos;s style.
            The AI will analyze the vocabulary, themes, and implied production
            style and pre-fill the DNA fields on the left.
          </p>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={10}
            className="input font-mono text-sm"
            placeholder={`[Verse 1]\nYour lyrics here…\n\n[Chorus]\n…`}
          />
          <button
            type="button"
            onClick={analyze}
            disabled={pending || !lyrics.trim()}
            className="btn"
          >
            {pending ? "Analyzing…" : "✨ Analyze lyrics"}
          </button>

          {suggestions && (
            <div className="space-y-2 pt-2 border-t border-[color:var(--color-border)]">
              <div className="text-sm font-medium">Suggested DNA updates</div>
              <dl className="text-xs space-y-1">
                {suggestions.tagline && (
                  <Row label="Tagline" value={suggestions.tagline} />
                )}
                {suggestions.genres?.length ? (
                  <Row label="Genres" value={suggestions.genres.join(", ")} />
                ) : null}
                {(suggestions.bpmMin || suggestions.bpmMax) && (
                  <Row
                    label="BPM range"
                    value={`${suggestions.bpmMin ?? "?"} – ${suggestions.bpmMax ?? "?"}`}
                  />
                )}
                {suggestions.vocalStyle && (
                  <Row label="Vocal style" value={suggestions.vocalStyle} />
                )}
                {suggestions.instrumentation?.length ? (
                  <Row
                    label="Instrumentation"
                    value={suggestions.instrumentation.join(", ")}
                  />
                ) : null}
                {suggestions.mixAesthetic && (
                  <Row label="Mix aesthetic" value={suggestions.mixAesthetic} />
                )}
                {suggestions.slang?.length ? (
                  <Row label="Slang / vocab" value={suggestions.slang.join(", ")} />
                ) : null}
                {suggestions.motifs?.length ? (
                  <Row label="Motifs" value={suggestions.motifs.join(", ")} />
                ) : null}
                {suggestions.influences?.length ? (
                  <Row
                    label="Influences"
                    value={suggestions.influences.join(", ")}
                  />
                ) : null}
              </dl>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={apply} className="btn">
                  Apply to form fields
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestions(null)}
                  className="btn-ghost btn"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-[color:var(--color-muted)] shrink-0 w-28">{label}</dt>
      <dd className="text-[color:var(--color-fg)]">{value}</dd>
    </div>
  );
}
