import SchoolLeftPanel from "#/app/(platform)/hc/schools/components/school-left-panel";
import SchoolsBreadcrumb from "#/app/(platform)/hc/schools/components/schools-breadcrumb";
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
      interventionSessions: true,
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

  return (
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
  );
}
