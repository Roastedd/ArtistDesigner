import Link from "next/link";

export function PersonaTabs({
  personaId,
  active,
}: {
  personaId: string;
  active: "studio" | "signature" | "albums" | "tracks" | "eras" | "releases";
}) {
  const tabs = [
    ["studio", "Studio", `/personas/${personaId}`],
    ["signature", "Signature", `/personas/${personaId}/signature`],
    ["albums", "Albums", `/personas/${personaId}/albums`],
    ["tracks", "Tracks", `/personas/${personaId}/tracks`],
    ["eras", "Eras", `/personas/${personaId}/eras`],
    ["releases", "Releases", `/personas/${personaId}/releases`],
  ] as const;
  return (
    <nav className="flex gap-1 mb-6 border-b border-[color:var(--color-border)] overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      {tabs.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          className={`px-3 py-2 text-sm -mb-px border-b-2 whitespace-nowrap shrink-0 ${
            active === key
              ? "border-[color:var(--color-accent)] text-white"
              : "border-transparent text-[color:var(--color-muted)] hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
