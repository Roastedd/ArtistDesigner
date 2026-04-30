import Link from "next/link";
import { Sparkles, Mic2, Disc3, Music2 } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";

export default async function CreditsPage() {
  const userId = await requireUserId();
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const credits = u?.credits ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credits</h1>
        <p className="text-[color:var(--color-muted)] mt-1 text-sm">
          Credits power AI generations. Manual flows are always free.
        </p>
      </div>

      <div
        className="rounded-2xl border border-[color:var(--color-border)] p-6 flex items-center gap-4"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, transparent) 0%, var(--color-bg-elev) 80%)",
        }}
      >
        <div
          className="h-14 w-14 rounded-xl bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] flex items-center justify-center"
          style={{
            boxShadow:
              "0 0 22px color-mix(in srgb, var(--color-accent) 40%, transparent)",
          }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <div className="text-3xl font-bold">{credits}</div>
          <div className="text-sm text-[color:var(--color-muted)]">
            credits remaining
          </div>
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold mb-3">Costs</h2>
        <ul className="divide-y divide-[color:var(--color-border)]/60 text-sm">
          <Row icon={Mic2} title="Generate Artist" cost="2 credits" />
          <Row icon={Disc3} title="Generate Album" cost="4 credits" />
          <Row icon={Music2} title="Generate Track" cost="2 credits" />
          <Row icon={Sparkles} title="Manual flows (Add / Build)" cost="Free" />
        </ul>
      </section>

      <p className="text-sm text-[color:var(--color-muted)]">
        More credit packs are on the way.{" "}
        <Link href="/dashboard" className="text-[color:var(--color-accent)] hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  cost,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  cost: string;
}) {
  return (
    <li className="py-2.5 flex items-center gap-3">
      <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
      <span className="flex-1">{title}</span>
      <span className="text-[color:var(--color-muted)]">{cost}</span>
    </li>
  );
}
