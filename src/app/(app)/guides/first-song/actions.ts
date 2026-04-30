"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const TOTAL_STEPS = 6;

export async function setOnboardingStep(step: number) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in" };
  const clamped = Math.max(0, Math.min(TOTAL_STEPS, Math.floor(step)));
  await db
    .update(users)
    .set({ onboardingStep: clamped })
    .where(eq(users.id, session.user.id));
  revalidatePath("/guides/first-song");
  revalidatePath("/dashboard");
  return { ok: true as const, step: clamped };
}

export async function setOnboardingPlatform(platform: "suno" | "udio") {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in" };
  if (platform !== "suno" && platform !== "udio") {
    return { ok: false as const, error: "Invalid platform" };
  }
  await db
    .update(users)
    .set({ onboardingPlatform: platform })
    .where(eq(users.id, session.user.id));
  revalidatePath("/guides/first-song");
  return { ok: true as const, platform };
}

export async function dismissOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in" };
  await db
    .update(users)
    .set({ onboardingDismissed: true })
    .where(eq(users.id, session.user.id));
  revalidatePath("/dashboard");
  revalidatePath("/guides/first-song");
  return { ok: true as const };
}

export async function resetOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in" };
  await db
    .update(users)
    .set({
      onboardingStep: 0,
      onboardingPlatform: null,
      onboardingDismissed: false,
    })
    .where(eq(users.id, session.user.id));
  revalidatePath("/guides/first-song");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
