"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Music,
  LayoutDashboard,
  Sparkles,
  Mic2,
  Disc3,
  Music2,
} from "lucide-react";
import SidebarNav from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";

type BottomItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const BOTTOM: BottomItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/personas", label: "Artists", icon: Mic2 },
  { href: "/personas/new", label: "Create", icon: Sparkles },
  { href: "/library/albums", label: "Albums", icon: Disc3 },
  { href: "/library/tracks", label: "Tracks", icon: Music2 },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileChrome({
  email,
  signOutAction,
  theme,
}: {
  email: string | null | undefined;
  signOutAction: () => Promise<void>;
  theme: string;
}) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const open = openPathname === pathname;

  // Lock body scroll while drawer open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="md:hidden sticky top-0 z-30 safe-top bg-[color:var(--color-bg)]/85 backdrop-blur-md border-b border-[color:var(--color-border)]">
        <div className="flex items-center justify-between h-14 px-3 safe-x">
          <button
            type="button"
            onClick={() => setOpenPathname(pathname)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-md text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-elev)] active:scale-95 transition"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
              style={{
                boxShadow:
                  "0 0 16px color-mix(in srgb, var(--color-accent) 35%, transparent)",
              }}
            >
              <Music className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">ArtistDesigner</span>
          </Link>
          <Link
            href="/personas/new"
            aria-label="Create artist"
            className="p-2 -mr-2 rounded-md text-[color:var(--color-accent)] hover:bg-[color:var(--color-bg-elev)] active:scale-95 transition"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenPathname(null)}
            className="absolute inset-0 bg-black/60 animate-overlay-in"
          />
          <aside className="relative w-[82vw] max-w-[320px] h-full bg-[color:var(--color-bg)] border-r border-[color:var(--color-border)] flex flex-col safe-top safe-bottom animate-drawer-in">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[color:var(--color-border)]">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]">
                  <Music className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold">ArtistDesigner</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpenPathname(null)}
                aria-label="Close"
                className="p-2 -mr-2 rounded-md hover:bg-[color:var(--color-bg-elev)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
              <SidebarNav />
            </div>
            <div className="border-t border-[color:var(--color-border)] px-4 py-3 flex items-center justify-between gap-2">
              <Link
                href="/settings"
                className="text-xs text-[color:var(--color-muted)] truncate"
              >
                {email}
              </Link>
              <div className="flex items-center gap-1">
                <ThemeToggle current={theme} />
                <form action={signOutAction}>
                  <button className="text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] underline">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 safe-bottom bg-[color:var(--color-bg)]/90 backdrop-blur-md border-t border-[color:var(--color-border)]">
        <ul className="grid grid-cols-5">
          {BOTTOM.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const isCreate = item.href === "/personas/new";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] tracking-wide transition active:scale-95 ${
                    active
                      ? "text-[color:var(--color-accent)]"
                      : "text-[color:var(--color-muted)]"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center ${
                      isCreate
                        ? "h-8 w-8 -mt-1 rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] shadow-[0_0_18px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]"
                        : ""
                    }`}
                  >
                    <Icon className={isCreate ? "h-4 w-4" : "h-5 w-5"} />
                  </span>
                  <span
                    className={
                      active && !isCreate ? "font-semibold" : undefined
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
