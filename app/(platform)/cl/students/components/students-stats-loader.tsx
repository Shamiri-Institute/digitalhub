"use client";

import ChartCard from "#/components/ui/chart-card";
import { Skeleton } from "#/components/ui/skeleton";

export default function StudentsStatsLoader() {
  return (
    <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-3">
      <ChartCard title="Students grouped by form" showCardFooter={false}>
        <div className="relative h-[220px] w-full">
          <Skeleton className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </ChartCard>

      <ChartCard title="Students grouped by age" showCardFooter={false}>
        <div className="relative h-[220px] w-full">
          <Skeleton className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </ChartCard>

      <ChartCard title="Students grouped by gender" showCardFooter={false}>
        <div className="relative h-[220px] w-full">
          <Skeleton className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <Skeleton className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        </div>
      </ChartCard>
    </div>
  );
}
