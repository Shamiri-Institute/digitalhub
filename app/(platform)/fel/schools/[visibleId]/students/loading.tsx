import { ImplementerRole } from "@prisma/client";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";

export default function Loading() {
  return <StudentsDatatableSkeleton role={ImplementerRole.FELLOW} />;
}
