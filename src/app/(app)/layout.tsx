import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import SidebarNav from "./sidebar-nav";
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

  return (
    <div
      data-theme={theme}
      style={accent ? ({ ["--color-accent" as string]: accent } as React.CSSProperties) : undefined}
      className="grid grid-cols-[240px_1fr] min-h-screen"
    >
      <aside className="border-r border-[color:var(--color-border)] p-4 flex flex-col gap-1">
        <Link href="/dashboard" className="font-mono text-sm mb-6 px-2 hover:opacity-80">
          ArtistDesigner
        </Link>
        <SidebarNav />
        <div className="mt-auto text-xs text-[color:var(--color-muted)] px-2 truncate">
          {session.user.email}
        </div>
        <Link
          href="/settings"
          className="text-xs px-2 py-1 text-[color:var(--color-muted)] hover:text-white"
        >
          Settings
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-xs px-2 py-1 text-[color:var(--color-muted)] hover:text-white">
            Sign out
          </button>
        </form>
      </aside>
      <main className="p-8 max-w-6xl">{children}</main>
      <FeedbackWidget />
    </div>
  );
}
