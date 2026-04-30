"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const VALID_THEMES = new Set(["dark", "light"]);
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export async function updatePreferences(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const themeRaw = String(formData.get("theme") ?? "dark");
  const theme = VALID_THEMES.has(themeRaw) ? themeRaw : "dark";
  const accentRaw = String(formData.get("accentColor") ?? "").trim();
  const accentColor = accentRaw && HEX_RE.test(accentRaw) ? accentRaw : null;

  await db
    .update(users)
    .set({ theme, accentColor })
    .where(eq(users.id, session.user.id));

  revalidatePath("/", "layout");
}

/** Quick theme toggle used by the topbar/sidebar button. */
export async function setTheme(theme: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const next = VALID_THEMES.has(theme) ? theme : "dark";
  await db
    .update(users)
    .set({ theme: next })
    .where(eq(users.id, session.user.id));

  revalidatePath("/", "layout");
}
