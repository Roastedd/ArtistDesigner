import { Skeleton } from "@/components/skeleton";

export default function PersonasLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Skeleton className="h-10 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
