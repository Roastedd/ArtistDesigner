import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { LogOut, Music } from "lucide-react";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import SidebarNav from "./sidebar-nav";
import MobileChrome from "./mobile-chrome";
import { FeedbackWidget } from "@/components/feedback-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const userId = session.user.id;
  const [u] = userId
    ? await db.select().from(users).where(eq(users.id, userId))
    : [undefined];
  const theme = u?.theme ?? "dark";
  const accent = u?.accentColor ?? null;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <div
      data-theme={theme}
      style={accent ? ({ ["--color-accent" as string]: accent } as React.CSSProperties) : undefined}
      className="md:grid md:grid-cols-[260px_1fr] min-h-screen"
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex border-r border-[color:var(--color-border)] flex-col h-screen sticky top-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-4 py-4 border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elev)]/50 transition-colors"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
            style={{ boxShadow: "0 0 18px color-mix(in srgb, var(--color-accent) 35%, transparent)" }}
          >
            <Music className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">ArtistDesigner</span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-[color:var(--color-muted)]">
              AI Music Studio
            </span>
          </div>
        </Link>

        <div className="flex-1 min-h-0 px-3 py-3 flex flex-col">
          <SidebarNav />
        </div>

        <div className="border-t border-[color:var(--color-border)] px-3 py-2.5 flex items-center justify-between gap-2">
          <Link
            href="/settings"
            className="flex-1 min-w-0 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] truncate transition-colors"
            title={session.user.email ?? ""}
          >
            {session.user.email}
          </Link>
          <form action={signOutAction}>
            <button
              aria-label="Sign out"
              className="p-1.5 rounded-md text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-elev)] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <MobileChrome email={session.user.email} signOutAction={signOutAction} />
        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 md:p-8 max-w-6xl w-full pb-24 md:pb-8 safe-x animate-fade-up">
          {children}
        </main>
      </div>
      <FeedbackWidget />
    </div>
  );
}

