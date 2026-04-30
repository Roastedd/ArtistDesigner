import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { personas } from "@/db/schema";
import { auth } from "@/auth";
import { CommandPalette } from "./command-palette";

/**
 * Server wrapper that loads the signed-in user's personas once per page
 * load and hands them to the client palette. Cheap (id + name only) and
 * piggy-backs on the layout that already calls `auth()`.
 */
export async function CommandPaletteMount() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const list = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(
      and(eq(personas.userId, session.user.id), isNull(personas.deletedAt)),
    )
    .orderBy(asc(personas.name));

  return <CommandPalette personas={list} />;
}
