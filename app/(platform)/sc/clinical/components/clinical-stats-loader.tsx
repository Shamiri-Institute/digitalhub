import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalStatsLoader() {
  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-16 bg-gray-200" />
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-20 bg-gray-200" />
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-24 bg-gray-200" />
          </div>
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full bg-gray-200" />
    </div>
  );
}
