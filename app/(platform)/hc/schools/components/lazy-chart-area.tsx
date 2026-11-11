"use client";

import dynamic from "next/dynamic";
import ChartAreaSkeleton from "./chart-area-skeleton";

// Recharts draws nothing until the browser measures its container, so loading it after the
// page costs no server-rendered chart and keeps it out of the JS before `load`.
const LazyChartArea = dynamic(() => import("./chart-area"), {
  ssr: false,
  loading: ChartAreaSkeleton,
});

export default LazyChartArea;
