import { ImplementerRole } from "#/db/enums";
import SchoolTabLoading from "#/components/common/schools/school-tab-loading";

export default function Loading() {
  return <SchoolTabLoading tab="students" fallbackRole={ImplementerRole.ADMIN} />;
}
