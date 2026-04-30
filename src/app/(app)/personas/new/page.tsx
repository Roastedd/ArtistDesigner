import { NewPersonaForm } from "./new-persona-form";
import { Sparkles } from "lucide-react";

export const maxDuration = 60;

export default function NewPersonaPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Create an Artist</h1>
      <p className="text-[color:var(--color-muted)] mt-1 mb-6">
        An artist is the foundation of every track and album. Describe a vibe
        — we’ll fill in genre, BPM, vocal style, instrumentation, palette,
        themes, and a paste-ready Suno prompt. You can edit anything after.
      </p>
      <div className="mb-6 rounded-xl border border-[color:var(--color-accent)]/20 bg-[color:var(--color-accent)]/5 px-4 py-3 text-sm text-[color:var(--color-fg)]/80 flex items-start gap-3">
        <Sparkles className="h-4 w-4 mt-0.5 text-[color:var(--color-accent)] shrink-0" />
        <div>
          <span className="font-medium text-[color:var(--color-fg)]">New to this?</span>{" "}
          Use{" "}
          <strong>Brainstorm with AI</strong>. Type a sentence like
          <em className="text-[color:var(--color-muted)]">
            {" “moody synth-pop ghost from a dead radio station” "}
          </em>
          and you’ll get a full artist back, ready to ship.
        </div>
      </div>
      <NewPersonaForm />
    </div>
  );
}
