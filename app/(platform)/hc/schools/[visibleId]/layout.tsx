import { fetchHubSupervisors } from "#/app/(platform)/hc/schools/actions";
import AssignPointSupervisor from "#/app/(platform)/hc/schools/components/assign-point-supervisor";
import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { DropoutSchool } from "#/app/(platform)/hc/schools/components/dropout-school-form";
import EditSchoolDetailsForm from "#/app/(platform)/hc/schools/components/edit-school-details-form";
import SchoolInfoProvider from "#/app/(platform)/hc/schools/components/school-info-provider";
import SchoolLeftPanel from "#/app/(platform)/hc/schools/components/school-left-panel";
import SchoolsBreadcrumb from "#/app/(platform)/hc/schools/components/schools-breadcrumb";
import { UndoDropoutSchool } from "#/app/(platform)/hc/schools/components/undo-dropout-school-form";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import React from "react";
import SchoolsNav from "../components/schools-nav";

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
      students: true,
      interventionSessions: true,
      schoolDropoutHistory: {
        include: {
          user: true,
        },
      },
      _count: {
        select: {
          interventionSessions: true,
          students: true,
          interventionGroups: {
            where: {
              archivedAt: null,
            },
          },
        },
      },
      hub: true,
    },
  });

  const hubCoordinator = await currentHubCoordinator();
  const supervisors = await fetchHubSupervisors({
    where: {
      hubId: hubCoordinator?.assignedHubId as string,
    },
  });

  return (
    <SchoolInfoProvider school={school as unknown as SchoolsTableData}>
      <div className="flex h-full bg-white">
        <SchoolLeftPanel selectedSchool={school} />
        <div className="flex flex-1 flex-col">
          <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
            <SchoolsBreadcrumb />
            <SchoolsNav visibleId={visibleId} />
            <Separator />
            {children}
          </div>
          <PageFooter />
        </div>
      </div>
      <EditSchoolDetailsForm />
      <AssignPointSupervisor supervisors={supervisors} />
      <DropoutSchool />
      <UndoDropoutSchool />
    </SchoolInfoProvider>
  );
}
