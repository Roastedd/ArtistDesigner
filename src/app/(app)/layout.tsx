import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import SidebarNav from "./sidebar-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <aside className="border-r border-[color:var(--color-border)] p-4 flex flex-col gap-1">
        <Link href="/dashboard" className="font-mono text-sm mb-6 px-2 hover:opacity-80">
          ArtistDesigner
        </Link>
        <SidebarNav />
        <div className="mt-auto text-xs text-[color:var(--color-muted)] px-2 truncate">
          {session.user.email}
        </div>
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
    </div>
  );
}
