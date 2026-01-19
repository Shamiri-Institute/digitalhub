import { Skeleton } from "#/components/ui/skeleton";

export function ScheduleCalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header: Title, Navigation, Mode Toggle, Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {/* Title and navigation */}
          <div className="flex items-center justify-between gap-6">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex gap-1 lg:mx-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          {/* Filter toggle */}
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Calendar grid - weekday headers */}
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-8 w-full" />
          ))}
        </div>

        {/* Calendar grid - day cells (5 weeks) */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`cell-${i}`} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
