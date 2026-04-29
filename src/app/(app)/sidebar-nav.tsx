"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/dashboard", "Dashboard"],
  ["/personas", "Personas"],
] as const;

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map(([href, label]) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-2 py-1.5 rounded text-sm transition-colors ${
              active
                ? "bg-[color:var(--color-accent)] text-black font-medium"
                : "hover:bg-[color:var(--color-bg-elev)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
