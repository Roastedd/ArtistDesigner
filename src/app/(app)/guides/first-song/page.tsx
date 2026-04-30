import { and, asc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { personas, users } from "@/db/schema";
import { Walkthrough } from "./walkthrough";

export const dynamic = "force-dynamic";

export default async function FirstSongPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const [user] = await db
    .select({
      onboardingStep: users.onboardingStep,
      onboardingPlatform: users.onboardingPlatform,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  const list = await db
    .select({ id: personas.id, name: personas.name })
    .from(personas)
    .where(and(eq(personas.userId, session.user.id), isNull(personas.deletedAt)))
    .orderBy(asc(personas.name));

  return (
    <Walkthrough
      initialStep={user?.onboardingStep ?? 0}
      initialPlatform={
        (user?.onboardingPlatform as "suno" | "udio" | null) ?? null
      }
      personas={list}
    />
  );
}
