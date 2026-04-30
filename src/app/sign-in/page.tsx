import { signIn, auth, hasMagicLink } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const hasGitHub = !!(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-6">
        Access your AI artist workspace.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {hasGitHub && (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/dashboard" });
            }}
          >
            <button type="submit" className="btn w-full justify-center flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Continue with GitHub
            </button>
          </form>
        )}

        {hasGitHub && <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted)]"><div className="flex-1 border-t border-[color:var(--color-border)]" /><span>or</span><div className="flex-1 border-t border-[color:var(--color-border)]" /></div>}

        <form
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: formData.get("email"),
                password: formData.get("password"),
                redirectTo: "/dashboard",
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect("/sign-in?error=Invalid%20email%20or%20password");
              }
              throw error;
            }
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="input"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 chars)"
            className="input"
          />
          <button type="submit" className="btn w-full justify-center">
            Sign in with password
          </button>
        </form>

        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("newEmail") ?? "")
              .trim()
              .toLowerCase();
            const name = String(formData.get("newName") ?? "").trim() || null;
            const password = String(formData.get("newPassword") ?? "");

            if (!email || password.length < 8) {
              redirect("/sign-in?error=Use%20a%20valid%20email%20and%20a%20password%20with%20at%20least%208%20characters");
            }

            const [existing] = await db
              .select({ id: users.id, passwordHash: users.passwordHash })
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (!existing) {
              await db.insert(users).values({
                email,
                name,
                passwordHash: hashPassword(password),
              });
            } else if (!existing.passwordHash) {
              await db
                .update(users)
                .set({ passwordHash: hashPassword(password), ...(name ? { name } : {}) })
                .where(eq(users.id, existing.id));
            } else {
              redirect("/sign-in?error=An%20account%20with%20this%20email%20already%20exists");
            }

            try {
              await signIn("credentials", {
                email,
                password,
                redirectTo: "/dashboard",
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect("/sign-in?error=Account%20created%20but%20sign-in%20failed.%20Try%20again");
              }
              throw error;
            }
          }}
          className="space-y-3 border border-[color:var(--color-border)] rounded p-4"
        >
          <div className="text-sm font-medium">Create account</div>
          <input
            name="newName"
            type="text"
            placeholder="Name (optional)"
            className="input"
          />
          <input
            name="newEmail"
            type="email"
            required
            placeholder="you@example.com"
            className="input"
          />
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder="Create password (min 8 chars)"
            className="input"
          />
          <button type="submit" className="btn-ghost btn w-full justify-center">
            Create account
          </button>
        </form>

        {hasMagicLink && <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted)]"><div className="flex-1 border-t border-[color:var(--color-border)]" /><span>or</span><div className="flex-1 border-t border-[color:var(--color-border)]" /></div>}

        {hasMagicLink && (
        <form
          action={async (formData) => {
            "use server";
            await signIn("nodemailer", {
              email: formData.get("email"),
              redirectTo: "/dashboard",
            });
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="input"
          />
          <button type="submit" className="btn-ghost btn w-full justify-center">
            Send magic link
          </button>
        </form>
        )}
      </div>

      {!hasMagicLink && (
        <p className="text-xs text-[color:var(--color-muted)] mt-6">
          Password accounts are enabled. Magic links are currently disabled.
        </p>
      )}
    </main>
  );
}
