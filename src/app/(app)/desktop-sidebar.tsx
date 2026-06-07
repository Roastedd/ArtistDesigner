"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Music, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SidebarNav from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DesktopSidebar({
  email,
  signOutAction,
  theme,
}: {
  email: string | null | undefined;
  signOutAction: () => Promise<void>;
  theme: string;
}) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <aside
      className={`hidden md:flex h-screen sticky top-0 shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg)]/92 backdrop-blur-xl transition-[width] duration-200 ease-out ${
        collapsed ? "w-[76px]" : "w-[272px]"
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-[color:var(--color-border)] px-3">
        <Link
          href="/dashboard"
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[color:var(--color-bg-elev)] ${
            collapsed ? "justify-center" : ""
          }`}
          aria-label="ArtistDesigner dashboard"
          title={collapsed ? "ArtistDesigner" : undefined}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
            style={{
              boxShadow:
                "0 0 18px color-mix(in srgb, var(--color-accent) 35%, transparent)",
            }}
          >
            <Music className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold">ArtistDesigner</span>
              <span className="truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                AI Music Studio
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-2 text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-bg-elev)] hover:text-[color:var(--color-fg)]"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div
        className={`border-t border-[color:var(--color-border)] px-3 py-2.5 ${
          collapsed ? "space-y-2" : "flex items-center justify-between gap-2"
        }`}
      >
        {!collapsed && (
          <Link
            href="/settings"
            className="min-w-0 flex-1 truncate text-xs text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-fg)]"
            title={email ?? ""}
          >
            {email}
          </Link>
        )}
        <div className={`flex items-center gap-1 ${collapsed ? "justify-center" : ""}`}>
          <ThemeToggle current={theme} />
          <form action={signOutAction}>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-1.5 text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-bg-elev)] hover:text-[color:var(--color-fg)]"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useStateFromStorage();

  function setCollapsed(next: boolean) {
    setCollapsedState(next);
    window.localStorage.setItem("app:sidebar-collapsed", next ? "1" : "0");
  }

  return [collapsed, setCollapsed] as const;
}

function useStateFromStorage() {
  return useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("app:sidebar-collapsed") === "1";
  });
}