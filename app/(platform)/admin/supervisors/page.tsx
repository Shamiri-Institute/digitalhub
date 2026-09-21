import { signOut } from "next-auth/react";

import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

export default async function SupervisorsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const supervisors = await db.query.supervisor.findMany({
    // Prisma dropped the implementer filter when the id was undefined; keep that.
    where: (s, { and, eq, inArray }) =>
      and(
        implementerId === undefined ? undefined : eq(s.implementerId, implementerId),
        inArray(s.hubId, db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId))),
      ),
    with: {
      assignedSchools: true,
      fellows: true,
      hub: { with: { project: true } },
      monthlySupervisorEvaluation: true,
    },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Supervisors" />
        <Separator />
        <MainSupervisorsDataTable
          supervisors={supervisors}
          role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
        />
      </div>
      <PageFooter />
    </div>
  );
}
