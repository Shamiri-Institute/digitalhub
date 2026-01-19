import { ImplementerRole } from "@prisma/client";
import FellowSchoolsDatatableSkeleton from "#/components/common/fellow/fellow-schools-datatable-skeleton";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function TableSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellow Portal" />
        <Separator />
        <FellowSchoolsDatatableSkeleton role={ImplementerRole.FELLOW} />
      </div>
      <PageFooter />
    </div>
  );
}
