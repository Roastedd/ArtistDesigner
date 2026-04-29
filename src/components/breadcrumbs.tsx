import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs text-[color:var(--color-muted)] mb-3 flex flex-wrap items-center gap-1"
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-white">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "text-white" : ""}>{c.label}</span>
            )}
            {!last && <span className="opacity-50">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
