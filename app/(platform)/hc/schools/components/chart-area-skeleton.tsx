import { ChartRowSkeleton } from "#/components/charts/chart-skeleton";

// The charts as the page lays them out, titled, so nothing moves when they draw.
export default function ChartAreaSkeleton() {
  return (
    <ChartRowSkeleton
      titles={["Session progress", "Drop out reasons", "School information completion", "Ratings"]}
    />
  );
}
