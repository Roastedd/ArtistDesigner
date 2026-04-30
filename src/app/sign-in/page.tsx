import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInCard } from "./sign-in-form";

const hasGitHub = !!(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const sp = await searchParams;
  const initialTab = sp.tab === "signup" ? "signup" : "signin";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] font-bold text-xl">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight">ArtistDesigner</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Your AI-powered artist workspace
        </p>
      </div>

      <SignInCard initialTab={initialTab} hasGitHub={hasGitHub} />
    </main>
  );
}
