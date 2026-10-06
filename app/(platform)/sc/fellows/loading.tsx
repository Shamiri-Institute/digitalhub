import FellowSchoolsDatatableSkeleton from "#/components/common/fellow/fellow-schools-datatable-skeleton";
import { ImplementerRole } from "#/db/enums";

export default function TableSkeleton() {
  return (
    <div className="px-6 py-5">
      <FellowSchoolsDatatableSkeleton role={ImplementerRole.SUPERVISOR} />
    </div>
  );
}
