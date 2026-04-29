import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <aside className="border-r border-[color:var(--color-border)] p-4 flex flex-col gap-1">
        <div className="font-mono text-sm mb-6 px-2">ArtistDesigner</div>
        {[
          ["/dashboard", "Dashboard"],
          ["/personas", "Personas"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="px-2 py-1.5 rounded text-sm hover:bg-[color:var(--color-bg-elev)]"
          >
            {label}
          </Link>
        ))}
        <div className="mt-auto text-xs text-[color:var(--color-muted)] px-2">
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
