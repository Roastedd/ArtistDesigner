import Link from "next/link";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";

export default async function PersonasPage() {
  const userId = await requireUserId();
  const list = await db
    .select()
    .from(personas)
    .where(eq(personas.userId, userId));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Personas</h1>
        <Link href="/personas/new" className="btn">+ New persona</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((p) => (
          <Link key={p.id} href={`/personas/${p.id}`} className="card hover:border-[color:var(--color-accent)]">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-[color:var(--color-muted)]">{p.tagline}</div>
            <div className="mt-3 text-xs text-[color:var(--color-muted)]">
              {(p.genres ?? []).join(" · ")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
