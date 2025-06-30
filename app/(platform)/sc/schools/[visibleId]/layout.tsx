import { fetchHubSupervisors } from "#/app/(platform)/hc/schools/actions";
import { currentSupervisor } from "#/app/auth";
import AssignPointSupervisor from "#/components/common/schools/assign-point-supervisor";
import type { SchoolsTableData } from "#/components/common/schools/columns";
import { DropoutSchool } from "#/components/common/schools/dropout-school-form";
import SchoolDetailsForm from "#/components/common/schools/school-details-form";
import SchoolInfoProvider from "#/components/common/schools/school-info-provider";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import { UndoDropoutSchool } from "#/components/common/schools/undo-dropout-school-form";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import type React from "react";
import SchoolsNav from "../../../../../components/common/schools/schools-nav";

export default async function SchoolViewLayout({
  children,
  params: { visibleId },
}: {
  children: React.ReactNode;
  params: { visibleId: string };
}) {
  const school = await db.school.findFirst({
    where: {
      visibleId,
    },
    include: {
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
      interventionSessions: {
        include: {
          session: true,
        },
      },
      schoolDropoutHistory: {
        include: {
          user: true,
        },
      },
      _count: {
        select: {
          interventionSessions: true,
          students: {
            where: {
              isClinicalCase: true,
            },
          },
          interventionGroups: {
            where: {
              archivedAt: null,
            },
          },
        },
      },
      hub: {
        include: {
          sessions: true,
        },
      },
    },
  });
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const supervisors = await fetchHubSupervisors({
    where: {
      hubId: supervisor?.hubId as string,
    },
  });

  return (
    <SchoolInfoProvider school={school as unknown as SchoolsTableData}>
      <div className="flex h-full bg-white">
        <div className="hidden lg:flex lg:w-1/4">
          <SchoolLeftPanel selectedSchool={school} open={true} />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
            <SchoolsBreadcrumb role={supervisor!.user.membership.role} />
            <SchoolsNav visibleId={visibleId} role={supervisor!.user.membership.role} />
            <Separator />
            {children}
          </div>
          <PageFooter />
        </div>
      </div>
      <SchoolDetailsForm />
      <AssignPointSupervisor supervisors={supervisors} />
      <DropoutSchool />
      <UndoDropoutSchool />
    </SchoolInfoProvider>
  );
}
