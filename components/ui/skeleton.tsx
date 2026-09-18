import { cn } from "#/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** Table cell placeholder for loading skeletons. Pass it as `cell: SkeletonCell` so its identity is stable. */
function SkeletonCell() {
  return <Skeleton className="h-5 w-full bg-gray-200" />;
}

export { Skeleton, SkeletonCell };
