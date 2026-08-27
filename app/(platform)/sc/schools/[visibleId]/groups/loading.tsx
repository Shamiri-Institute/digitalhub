import { ImplementerRole } from "@prisma/client";
import SchoolTabLoading from "#/components/common/schools/school-tab-loading";

export default function Loading() {
  return <SchoolTabLoading tab="groups" fallbackRole={ImplementerRole.SUPERVISOR} />;
}
