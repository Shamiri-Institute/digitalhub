import SchoolsDatatableSkeleton from "#/components/common/schools/schools-datatable-skeleton";
import { ImplementerRole } from "#/db/enums";

export default function Loading() {
  return (
    <div className="container w-full grow space-y-3 py-10">
      <SchoolsDatatableSkeleton role={ImplementerRole.FELLOW} />
    </div>
  );
}
