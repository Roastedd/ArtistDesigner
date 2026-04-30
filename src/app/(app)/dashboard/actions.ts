"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUserId } from "@/lib/require-auth";

export async function updateProducerName(formData: FormData) {
  const userId = await requireUserId();
  const raw = String(formData.get("producerName") ?? "").trim().slice(0, 60);
  await db
    .update(users)
    .set({ producerName: raw || null })
    .where(eq(users.id, userId));
  revalidatePath("/dashboard");
}
