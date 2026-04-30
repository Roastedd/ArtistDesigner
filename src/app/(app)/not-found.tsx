import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto py-16 text-center animate-fade-up">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)] border border-[color:var(--color-accent)]/30">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold mb-2">We can&apos;t find that page</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-6">
        The link may have moved, or the artist might be private.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/dashboard" className="btn">Go to dashboard</Link>
        <Link href="/personas" className="btn-ghost btn">My artists</Link>
      </div>
    </div>
  );
}
