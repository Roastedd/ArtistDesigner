export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-md bg-[color:var(--color-bg-elev)] " +
        className
      }
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,color-mix(in_srgb,var(--color-fg)_8%,transparent)_50%,transparent_70%)] bg-[length:200%_100%]"
        style={{ animation: "shimmer 1.4s linear infinite" }}
      />
    </div>
  );
}
