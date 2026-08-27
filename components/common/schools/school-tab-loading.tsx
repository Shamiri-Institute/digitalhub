import type { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
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
} as const;

export default async function SchoolTabLoading({
  tab,
  fallbackRole,
}: {
  tab: keyof typeof SKELETONS;
  fallbackRole: ImplementerRole;
}) {
  const session = await getCurrentUserSession();
  if (!session) {
    await signOut({ callbackUrl: "/login" });
  }
  const Skeleton = SKELETONS[tab];
  return <Skeleton role={session?.user.activeMembership?.role ?? fallbackRole} />;
}
