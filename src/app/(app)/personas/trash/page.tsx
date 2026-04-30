import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";
import {
  restorePersona,
  hardDeletePersona,
} from "../actions";
import { DeleteButton } from "@/components/delete-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ just?: string }>;
}) {
  const userId = await requireUserId();
  const { just } = await searchParams;
  const list = await db
    .select()
    .from(personas)
    .where(and(eq(personas.userId, userId), isNotNull(personas.deletedAt)))
    .orderBy(desc(personas.updatedAt));

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Personas", href: "/personas" },
          { label: "Trash" },
        ]}
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Trash</h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Soft-deleted personas. Restore to recover them, or delete forever
            to remove all related data permanently.
          </p>
        </div>
        <Link href="/personas" className="btn-ghost btn">
          ← Back to personas
        </Link>
      </div>

      {just && (
        <div className="card mb-4 flex items-center justify-between bg-[color:var(--color-bg-elev)]">
          <div className="text-sm">Persona moved to trash.</div>
          <form
            action={async () => {
              "use server";
              await restorePersona(just);
            }}
          >
            <button className="btn-ghost btn text-xs">Undo</button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="card text-sm text-[color:var(--color-muted)]">
            Trash is empty.
          </div>
        )}
        {list.map((p) => (
          <div key={p.id} className="card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-[color:var(--color-muted)]">
                Deleted{" "}
                {p.deletedAt
                  ? new Date(p.deletedAt).toLocaleString()
                  : "—"}
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await restorePersona(p.id);
              }}
            >
              <button className="btn-ghost btn text-xs">Restore</button>
            </form>
            <DeleteButton
              action={async () => {
                "use server";
                await hardDeletePersona(p.id);
              }}
              label="Delete forever"
              confirm={`Permanently delete "${p.name}" and all related data? This cannot be undone.`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
