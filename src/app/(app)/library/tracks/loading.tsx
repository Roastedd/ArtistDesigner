import { Skeleton } from "@/components/skeleton";

export default function TracksLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-72 rounded-md" />
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 rounded-none border-b border-[color:var(--color-border)] last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
