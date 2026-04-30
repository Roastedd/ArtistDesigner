"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Disc3,
  Music2,
  UserPlus,
  ListMusic,
  Plus,
  Mic2,
  Globe2,
  HelpCircle,
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
  { href: "/library/playlists", label: "Playlists", icon: ListMusic },
];

const DISCOVER: Item[] = [
  { href: "/explore", label: "Explore", icon: Globe2 },
];

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(path + "/");
}

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all ${
        active
          ? "text-[color:var(--color-accent)]"
          : "text-[color:var(--color-fg)]/80 hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-elev)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[color:var(--color-accent)]" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Section({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: Item[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {title && (
        <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-[color:var(--color-muted)]">
          {title}
        </div>
      )}
      {items.map((it) => (
        <NavLink key={it.href + it.label} item={it} pathname={pathname} />
      ))}
    </div>
  );
}

export default function SidebarNav({ credits }: { credits: number }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0">
      <div className="overflow-y-auto pr-1 -mr-1 flex-1 flex flex-col gap-1">
        <Section items={TOP} pathname={pathname} />
        <Section title="Create" items={CREATE} pathname={pathname} />
        <Section title="My Library" items={LIBRARY} pathname={pathname} />
        <Section title="Discover" items={DISCOVER} pathname={pathname} />
      </div>

      <div className="mt-3 pt-3 border-t border-[color:var(--color-border)] flex flex-col gap-2">
        <div className="flex items-center justify-between px-2.5 py-2 rounded-md bg-[color:var(--color-bg-elev)]">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-[color:var(--color-accent)]" />
            <span className="font-semibold text-[color:var(--color-accent)]">
              {credits}
            </span>
            <span className="text-[color:var(--color-muted)]">credits</span>
          </div>
          <Link
            href="/credits"
            aria-label="About credits"
            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex items-center gap-3 px-2.5 text-[11px] text-[color:var(--color-muted)]">
          <Link href="/guides" className="hover:text-[color:var(--color-fg)] transition-colors">
            Guides
          </Link>
          <Link
            href="/guides/how-ai-works"
            className="hover:text-[color:var(--color-fg)] transition-colors"
          >
            How AI Works
          </Link>
        </div>
      </div>
    </div>
  );
}
