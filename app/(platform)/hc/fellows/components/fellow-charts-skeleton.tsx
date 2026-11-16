import { ChartRowSkeleton } from "#/components/charts/chart-skeleton";

export default function FellowChartsSkeleton() {
  return (
    <ChartRowSkeleton
      titles={["Attendances", "Drop out reasons", "Fellows information completion", "Ratings"]}
    />
  );
}
