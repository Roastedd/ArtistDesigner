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
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 20%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)",
        }}
      />

      {/* Brand header */}
      <div className="mb-8 text-center animate-[fadeSlideDown_350ms_ease_both]">
        <div
          className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-xl shadow-lg"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-fg)",
            boxShadow: "0 0 24px color-mix(in srgb, var(--color-accent) 40%, transparent)",
          }}
        >
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
