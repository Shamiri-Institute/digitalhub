import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getActiveProjectId } from "#/lib/active-project-id";
import { db } from "#/lib/db";
import HubsDataTable from "./components/hubs-datatable";

export default async function HubsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();
  const role = admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN;

  const hubs =
    implementerId != null
      ? await db.hub.findMany({
          where: {
            implementerId,
            projectId,
          },
          include: {
            schools: {
              include: {
                assignedSupervisor: true,
                interventionSessions: {
                  include: {
                    sessionRatings: true,
                    session: true,
                  },
                },
                students: {
                  include: {
                    assignedGroup: true,
                    _count: {
                      select: {
                        clinicalCases: true,
                      },
                    },
                  },
                },
              },
            },
            implementer: true,
            coordinators: true,
            _count: {
              select: {
                fellows: {
                  where: {
                    OR: [{ droppedOut: false }, { droppedOut: null }],
                  },
                },
                supervisors: {
                  where: {
                    OR: [{ droppedOut: false }, { droppedOut: null }],
                  },
                },
              },
            },
          },
        })
      : [];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Hubs" />
        <Separator />
        <HubsDataTable hubs={hubs} role={role} />
      </div>
      <PageFooter />
    </div>
  );
}
