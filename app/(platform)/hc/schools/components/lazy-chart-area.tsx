"use client";

import dynamic from "next/dynamic";
import ChartSkeleton from "#/components/charts/chart-skeleton";

// Recharts draws nothing until the browser measures its container, so loading it after the
// page costs no server-rendered chart and keeps it out of the JS before `load`.
const LazyChartArea = dynamic(() => import("./chart-area"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  ),
});

export default LazyChartArea;
