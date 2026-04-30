import { Skeleton } from "@/components/skeleton";

export default function PersonaDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Skeleton className="h-5 w-72" />
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[color:var(--color-border)] pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-md" />
        ))}
      </div>
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton className="h-28 w-28 rounded-xl" />
        <div className="flex-1 space-y-3 py-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      {/* Card sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
