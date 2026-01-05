import type { ReactNode } from "react";
import ChartSkeleton from "#/components/charts/chart-skeleton";
import InfoCardSkeleton from "#/components/info-card-skeleton";

export default function AdminStudentLoadingPage() {
  function renderChartWidgets(num: number) {
    const out: ReactNode[] = [];
    for (let i = 0; i < num; i++) {
      out.push(<ChartSkeleton key={i} />);
    }

    return out;
  }

  return (
    <div className="container w-full grow space-y-3 py-10">
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">{renderChartWidgets(4)}</div>
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">{renderChartWidgets(4)}</div>
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-3">{renderChartWidgets(3)}</div>
    </div>
  );
}
