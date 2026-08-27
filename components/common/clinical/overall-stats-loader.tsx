import { Skeleton } from "#/components/ui/skeleton";

export default function OverallStatsLoader() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
