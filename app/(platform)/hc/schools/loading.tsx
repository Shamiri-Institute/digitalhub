import SchoolsDatatableSkeleton from "#/components/common/schools/schools-datatable-skeleton";
import { ImplementerRole } from "#/db/enums";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import ChartAreaSkeleton from "./components/chart-area-skeleton";

// Laid out as page.tsx is, so the heading shows at once and nothing moves when the page streams in.
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Schools" />
        <Separator />
        <div className="flex items-center justify-between">
          <Skeleton className="h-9.5 w-1/4 rounded-lg" />
          <Skeleton className="h-9 w-49" />
        </div>
        <ChartAreaSkeleton />
        <Separator />
        <SchoolsDatatableSkeleton role={ImplementerRole.HUB_COORDINATOR} />
      </div>
      <PageFooter />
    </div>
  );
}
