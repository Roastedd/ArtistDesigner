"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  Disc3,
  Music2,
  Mic2,
  Settings,
  Globe2,
  BookOpen,
  Trash2,
  Upload,
} from "lucide-react";

type Persona = { id: string; name: string };

/**
 * Global Cmd+K / Ctrl+K command palette. Mounted once from the app layout.
 *
 * Uses cmdk's `<Command>` (not `<Command.Dialog>`) so we don't pull in
 * `@radix-ui/react-dialog` as an extra peer dependency.
 */
export function CommandPalette({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/60 animate-overlay-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Command
        label="Command palette"
        className="w-full max-w-xl bg-[color:var(--color-bg-elev)] border border-[color:var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        <Command.Input
          autoFocus
          placeholder="Type a command, search artists…"
          className="w-full bg-transparent border-0 border-b border-[color:var(--color-border)] px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-muted)]"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-[color:var(--color-muted)]">
            No matches.
          </Command.Empty>

          <Command.Group heading="Quick actions">
            <PaletteItem
              icon={Sparkles}
              label="Generate Artist"
              onSelect={() => go("/personas/new")}
            />
            <PaletteItem
              icon={Sparkles}
              label="Generate Album"
              onSelect={() => go("/library/albums?new=ai")}
            />
            <PaletteItem
              icon={Sparkles}
              label="Generate Track"
              onSelect={() => go("/library/tracks?new=ai")}
            />
            <PaletteItem
              icon={Plus}
              label="Add Artist (manual)"
              onSelect={() => go("/personas/new?mode=manual")}
            />
            <PaletteItem
              icon={Upload}
              label="Import Artist (JSON)"
              onSelect={() => go("/personas/import")}
            />
          </Command.Group>

          <Command.Group heading="Go to">
            <PaletteItem
              icon={LayoutDashboard}
              label="Dashboard"
              onSelect={() => go("/dashboard")}
            />
            <PaletteItem
              icon={Mic2}
              label="My Artists"
              onSelect={() => go("/personas")}
            />
            <PaletteItem
              icon={Disc3}
              label="My Albums"
              onSelect={() => go("/library/albums")}
            />
            <PaletteItem
              icon={Music2}
              label="My Tracks"
              onSelect={() => go("/library/tracks")}
            />
            <PaletteItem
              icon={Globe2}
              label="Explore"
              onSelect={() => go("/explore")}
            />
            <PaletteItem
              icon={BookOpen}
              label="Guides"
              onSelect={() => go("/guides")}
            />
            <PaletteItem
              icon={Settings}
              label="Settings"
              onSelect={() => go("/settings")}
            />
            <PaletteItem
              icon={Trash2}
              label="Trash"
              onSelect={() => go("/personas/trash")}
            />
          </Command.Group>

          {personas.length > 0 && (
            <Command.Group heading="Artists">
              {personas.map((p) => (
                <PaletteItem
                  key={p.id}
                  icon={Mic2}
                  label={p.name}
                  // Include id so duplicate-named artists still match uniquely.
                  value={`${p.name} ${p.id}`}
                  onSelect={() => go(`/personas/${p.id}`)}
                />
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="px-3 py-2 border-t border-[color:var(--color-border)] flex items-center justify-between text-[10px] text-[color:var(--color-muted)]">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate · <Kbd>↵</Kbd> select
          </span>
          <span>
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </Command>
    </div>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  value,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm cursor-pointer text-[color:var(--color-fg)]/85 data-[selected=true]:bg-[color:var(--color-bg)] data-[selected=true]:text-[color:var(--color-fg)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--color-muted)]" />
      <span className="flex-1 truncate">{label}</span>
    </Command.Item>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] font-mono text-[10px]">
      {children}
    </kbd>
  );
}
