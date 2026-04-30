import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function HowAIWorksPage() {
  return (
    <article className="prose prose-invert max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[color:var(--color-accent)]" />
          How AI Works
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          A look under the hood of the brainstorm engine.
        </p>
      </div>

      <Section title="1. You describe a vibe">
        On <Link href="/personas/new" className="text-[color:var(--color-accent)] hover:underline">/personas/new</Link>{" "}
        you write a short, freeform prompt — think mood, era, instruments, or
        cultural reference points. It can be one sentence.
      </Section>

      <Section title="2. We call OpenRouter">
        Your vibe is sent to a fast model on{" "}
        <a
          href="https://openrouter.ai"
          className="text-[color:var(--color-accent)] hover:underline"
          rel="noreferrer"
          target="_blank"
        >
          OpenRouter
        </a>
        . The system prompt asks for a single JSON object with a name, tagline,
        bio, genres, vocal style, instrumentation, mix aesthetic, influences,
        and motifs.
      </Section>

      <Section title="3. We parse, validate, render">
        We strip code fences, extract the first JSON block, and validate the
        shape. Then you get an editable preview — every field is yours to tweak
        before you save the artist.
      </Section>

      <Section title="4. Persona Core">
        Once saved, the artist gets a locked &quot;Persona Core&quot; prompt
        block. That block keeps every future track consistent — same voice,
        same flavor, same world.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-sm text-[color:var(--color-muted)] leading-relaxed">
        {children}
      </p>
    </section>
  );
}
