"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";

export async function submitFeedback({
  emoji,
  message,
}: {
  emoji?: string;
  message?: string;
}) {
  if (!emoji && !message?.trim()) return;

  const session = await auth();

  await db.insert(feedback).values({
    userId: session?.user?.id ?? null,
    emoji: emoji ?? null,
    message: message?.trim() ?? null,
  });
}
