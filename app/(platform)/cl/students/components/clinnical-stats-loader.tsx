"use client";

import ChartCard from "#/components/ui/chart-card";
import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalStatsLoader() {
  return (
    <div className="grid grid-cols-1 gap-5 py-2 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard showCardFooter={false} title="Clinical Cases by Case Status">
        <div className="relative h-[220px] w-full">
          <Skeleton className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </ChartCard>

      <ChartCard showCardFooter={false} title="Clinical Sessions">
        <div className="h-[307px] w-full space-y-2">
          <Skeleton className="h-[40px] w-full" />
          <Skeleton className="h-[40px] w-3/4" />
          <Skeleton className="h-[40px] w-5/6" />
          <Skeleton className="h-[40px] w-2/3" />
          <Skeleton className="h-[40px] w-4/5" />
        </div>
      </ChartCard>

      <ChartCard showCardFooter={false} title="Clinical Cases by Supervisor">
        <div className="relative h-[220px] w-full space-y-2">
          <Skeleton className="h-[40px] w-full" />
          <Skeleton className="h-[40px] w-3/4" />
          <Skeleton className="h-[40px] w-5/6" />
          <Skeleton className="h-[40px] w-2/3" />
          <Skeleton className="h-[40px] w-4/5" />
        </div>
      </ChartCard>

      <ChartCard showCardFooter={false} title="Clinical Cases by Initial Contact">
        <div className="relative h-[220px] w-full">
          <Skeleton className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </ChartCard>
    </div>
  );
}
