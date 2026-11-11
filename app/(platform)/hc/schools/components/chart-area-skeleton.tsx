import ChartSkeleton from "#/components/charts/chart-skeleton";

// The charts as the page lays them out, titled, so nothing moves when they draw.
export default function ChartAreaSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 md:grid-cols-4">
      <ChartSkeleton title="Session progress" />
      <ChartSkeleton title="Drop out reasons" />
      <ChartSkeleton title="School information completion" />
      <ChartSkeleton title="Ratings" />
    </div>
  );
}
