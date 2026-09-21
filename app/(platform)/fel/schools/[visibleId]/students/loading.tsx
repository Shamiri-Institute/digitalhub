import { ImplementerRole } from "#/db/enums";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";

export default function Loading() {
  return <StudentsDatatableSkeleton role={ImplementerRole.FELLOW} />;
}
