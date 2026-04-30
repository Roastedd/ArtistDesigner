import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Getting started */}
      <Skeleton className="h-44 rounded-2xl" />

      {/* Producer name */}
      <Skeleton className="h-20 rounded-xl" />

      {/* Action grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Recent artists */}
      <div>
        <Skeleton className="h-5 w-36 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[color:var(--color-border)] overflow-hidden"
            >
              <Skeleton className="aspect-square rounded-none" />
              <Skeleton className="h-9 rounded-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
