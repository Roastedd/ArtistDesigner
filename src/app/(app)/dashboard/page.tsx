import Link from "next/link";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/require-auth";

export default async function Dashboard() {
  const userId = await requireUserId();
  const list = await db.select().from(personas).where(eq(personas.userId, userId));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/personas/new" className="btn">+ New persona</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {list.length === 0 && (
          <div className="card col-span-full">
            <div className="font-medium mb-1">No personas yet</div>
            <div className="text-sm text-[color:var(--color-muted)] mb-4">
              Start by creating your first AI artist.
            </div>
            <Link href="/personas/new" className="btn">Create persona</Link>
          </div>
        )}
        {list.map((p) => (
          <Link key={p.id} href={`/personas/${p.id}`} className="card hover:border-[color:var(--color-accent)]">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-[color:var(--color-muted)] line-clamp-2">
              {p.tagline ?? "No tagline yet"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
