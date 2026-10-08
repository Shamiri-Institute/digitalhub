import SchoolsDatatableSkeleton from "#/components/common/schools/schools-datatable-skeleton";
import ChartSkeleton from "#/components/charts/chart-skeleton";
import { ImplementerRole } from "#/db/enums";

export default function Loading() {
  return (
    <div className="container w-full grow space-y-3 py-10">
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <SchoolsDatatableSkeleton role={ImplementerRole.HUB_COORDINATOR} />
    </div>
  );
}
