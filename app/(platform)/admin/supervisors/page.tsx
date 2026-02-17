import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getActiveProjectId } from "#/lib/active-project-id";
import { db } from "#/lib/db";

export default async function SupervisorsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const supervisors = await db.supervisor.findMany({
    where: {
      implementerId,
      hub: {
        projectId,
      },
    },
    include: {
      assignedSchools: true,
      fellows: true,
      hub: {
        include: {
          project: true,
        },
      },
      monthlySupervisorEvaluation: true,
    },
    orderBy: {
      supervisorName: "asc",
    },
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
