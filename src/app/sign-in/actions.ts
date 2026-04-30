"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

export type AuthState = { error: string } | null;

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password. Please try again." };
    }
    throw err; // re-throws NEXT_REDIRECT — handled by Next.js
  }
  return null;
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email) return { error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Please enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.passwordHash) {
    return {
      error: "An account with this email already exists. Try signing in.",
    };
  }

  if (!existing) {
    await db
      .insert(users)
      .values({ email, name, passwordHash: hashPassword(password) });
  } else {
    // OAuth-only user — attach a password
    await db
      .update(users)
      .set({
        passwordHash: hashPassword(password),
        ...(name ? { name } : {}),
      })
      .where(eq(users.id, existing.id));
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error: "Account created! There was a sign-in issue — please sign in.",
      };
    }
    throw err;
  }
  return null;
}

export async function gitHubSignInAction() {
  await signIn("github", { redirectTo: "/dashboard" });
}
