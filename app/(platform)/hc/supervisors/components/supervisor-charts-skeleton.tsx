import { ChartRowSkeleton } from "#/components/charts/chart-skeleton";

export default function SupervisorChartsSkeleton() {
  return (
    <ChartRowSkeleton
      titles={["Attendances", "Drop out reasons", "Supervisor information completion", "Ratings"]}
    />
  );
}
