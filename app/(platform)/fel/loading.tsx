import { Skeleton } from "#/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container w-full grow space-y-3 py-10">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
