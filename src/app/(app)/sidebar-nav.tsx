"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Disc3,
  Music2,
  UserPlus,
  Plus,
  Mic2,
  Globe2,
  BookOpen,
  Lightbulb,
  Search,
  Wand2,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TOP: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const CREATE: Item[] = [
  { href: "/personas/new", label: "Generate Artist", icon: Sparkles },
  { href: "/library/albums?new=ai", label: "Generate Album", icon: Sparkles },
  { href: "/library/tracks?new=ai", label: "Generate Track", icon: Sparkles },
  { href: "/personas/new?mode=manual", label: "Add Artist", icon: UserPlus },
  { href: "/library/albums?new=manual", label: "Build Album", icon: Plus },
  { href: "/library/tracks?new=manual", label: "Add Track", icon: Plus },
];

const LIBRARY: Item[] = [
  { href: "/personas", label: "My Artists", icon: Mic2 },
  { href: "/library/albums", label: "My Albums", icon: Disc3 },
  { href: "/library/tracks", label: "My Tracks", icon: Music2 },
];

const DISCOVER: Item[] = [
  { href: "/explore", label: "Explore", icon: Globe2 },
];

const LEARN: Item[] = [
  { href: "/guides/first-song", label: "Make your first song", icon: Wand2 },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/guides/how-ai-works", label: "How AI Works", icon: Lightbulb },
];

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(path + "/");
}

function NavLink({
  item,
  pathname,
  collapsed = false,
}: {
  item: Item;
  pathname: string;
  collapsed?: boolean;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center rounded-md text-sm transition-all ${
        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2"
      } ${
        active
          ? "bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]"
          : "text-[color:var(--color-fg)]/80 hover:bg-[color:var(--color-bg-elev)] hover:text-[color:var(--color-fg)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[color:var(--color-accent)]" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function Section({
  title,
  items,
  pathname,
  collapsed = false,
}: {
  title?: string;
  items: Item[];
  pathname: string;
  collapsed?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {title && !collapsed && (
        <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-[color:var(--color-muted)]">
          {title}
        </div>
      )}
      {items.map((it) => (
        <NavLink
          key={it.href + it.label}
          item={it}
          pathname={pathname}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

export default function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <CommandPaletteButton collapsed={collapsed} />
      <div
        className={`flex flex-1 flex-col gap-1 overflow-y-auto ${
          collapsed ? "pr-0" : "-mr-1 pr-1"
        }`}
      >
        <Section items={TOP} pathname={pathname} collapsed={collapsed} />
        <Section title="Create" items={CREATE} pathname={pathname} collapsed={collapsed} />
        <Section title="My Library" items={LIBRARY} pathname={pathname} collapsed={collapsed} />
        <Section title="Discover" items={DISCOVER} pathname={pathname} collapsed={collapsed} />
        <Section title="Learn" items={LEARN} pathname={pathname} collapsed={collapsed} />
      </div>
    </div>
  );
}

/**
 * Visible affordance for the global Cmd+K palette. Dispatches a synthetic
 * keydown so we don't need to expose an extra context across the tree.
 */
function CommandPaletteButton({ collapsed = false }: { collapsed?: boolean }) {
  const [mac] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  });
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            ctrlKey: !mac,
            metaKey: mac,
            bubbles: true,
          }),
        );
      }}
      title={collapsed ? "Quick search" : undefined}
      className={`hidden items-center rounded-md text-xs text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-bg-elev)] hover:text-[color:var(--color-fg)] md:flex ${
        collapsed ? "mb-2 justify-center px-0 py-2.5" : "mb-2 gap-2 px-2.5 py-1.5"
      }`}
      aria-label="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Quick search…</span>
          <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px]">
            {mac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </>
      )}
    </button>
  );
}
