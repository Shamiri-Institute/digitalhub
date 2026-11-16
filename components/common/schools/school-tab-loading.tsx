import FellowsDatatableSkeleton from "#/components/common/fellow/fellows-datatable-skeleton";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";
import SupervisorsDatatableSkeleton from "#/components/common/supervisor/supervisors-datatable-skeleton";

const SKELETONS = {
  students: StudentsDatatableSkeleton,
  sessions: SessionsDatatableSkeleton,
  groups: GroupsDatatableSkeleton,
  fellows: FellowsDatatableSkeleton,
  supervisors: SupervisorsDatatableSkeleton,
};

export default function SchoolTabLoading({ tab }: { tab: keyof typeof SKELETONS }) {
  const Skeleton = SKELETONS[tab];
  return <Skeleton />;
}
