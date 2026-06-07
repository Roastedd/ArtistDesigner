import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import DesktopSidebar from "./desktop-sidebar";
import MobileChrome from "./mobile-chrome";
import { FeedbackWidget } from "@/components/feedback-widget";
import { CommandPaletteMount } from "@/components/command-palette-mount";

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
      className="min-h-screen bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-bg-elev)_58%,var(--color-bg))_0%,var(--color-bg)_34%)] md:flex"
    >
      <DesktopSidebar
        email={session.user.email}
        signOutAction={signOutAction}
        theme={theme}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileChrome
          email={session.user.email}
          signOutAction={signOutAction}
          theme={theme}
        />
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 safe-x animate-fade-up sm:px-6 sm:py-6 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <FeedbackWidget />
      <CommandPaletteMount />
    </div>
  );
}

