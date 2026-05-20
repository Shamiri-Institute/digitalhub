import { Skeleton } from "#/components/ui/skeleton";

const TOP_SKELETON_ROWS = ["t1", "t2", "t3"];
const BOTTOM_SKELETON_ROWS = ["b1", "b2", "b3", "b4"];

export default function TriagePageLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
        <div className="rounded-lg border">
          {TOP_SKELETON_ROWS.map((id) => (
            <div key={id} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-8" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-80" />
        <div className="rounded-lg border">
          {BOTTOM_SKELETON_ROWS.map((id) => (
            <div key={id} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
