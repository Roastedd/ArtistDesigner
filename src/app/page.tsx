import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <header className="flex items-center justify-between mb-16">
        <div className="font-mono text-sm tracking-tight">ArtistDesigner</div>
        <nav className="flex gap-3">
          <Link href="/sign-in" className="btn-ghost btn">Sign in</Link>
        </nav>
      </header>

      <section className="space-y-6">
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl">
          Build a fictional AI artist with one locked identity.
        </h1>
        <p className="text-lg text-[color:var(--color-muted)] max-w-2xl">
          ArtistDesigner is the persona-first creative OS. Define a single
          character&rsquo;s sound, look, and lore — then generate consistent
          Suno/Udio prompts and lyrics, plan releases, and ship to distribution.
        </p>
        <div className="flex gap-3 pt-4">
          <Link href="/sign-in" className="btn">Start building</Link>
          <a href="https://openrouter.ai/models" target="_blank" className="btn-ghost btn">
            Powered by OpenRouter
          </a>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-20">
        {[
          ["Persona Studio", "Identity, sonic DNA, visual DNA, slang & motifs."],
          ["Prompt Forge", "Auto-injects your Persona Core into every Suno/Udio prompt."],
          ["Release Coach", "Step-by-step distribution checklist from master to streaming."],
        ].map(([t, d]) => (
          <div key={t} className="card">
            <div className="font-medium mb-1">{t}</div>
            <div className="text-sm text-[color:var(--color-muted)]">{d}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
