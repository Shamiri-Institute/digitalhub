import { notFound } from "next/navigation";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { db } from "#/lib/db";

import { GroupContentCoverage } from "#/app/(platform)/schools/[visibleId]/[groudId]/components/group-content-coverage";
import { GroupDisciplineRater } from "#/app/(platform)/schools/[visibleId]/[groudId]/components/group-cooperation-rater";
import { GroupEngagementRater } from "#/app/(platform)/schools/[visibleId]/[groudId]/components/group-engagement-rater";
import { GroupReportHeader } from "#/app/(platform)/schools/[visibleId]/[groudId]/components/group-report-header";
import { Prisma } from "@prisma/client";

const sessionTypeToDisplayName: {
  [key: string]: string;
} = {
  // s0: "Pre session",
  // s1: "Session 01",
  // s2: "Session 02",
  // s3: "Session 03",
  // s4: "Session 04",
  all: "All Sessions",
};

export default async function GroupReport({
  searchParams,
  params,
}: {
  searchParams: { type: string };
  params: {
    visibleId: string;
    groudId: string;
  };
}) {
  const { visibleId, groudId } = params;
  const { type: sessionType } = searchParams;

  if (!sessionType) {
    notFound();
  }

  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const selectedSchool = await db.school.findUnique({
    where: { visibleId: visibleId },
  });

  if (!selectedSchool) {
    notFound();
  }

  const schoolName = selectedSchool.schoolName;

  let session: Prisma.InterventionSessionGetPayload<{}> | null = null;

  if (sessionType !== "all") {
    session = await db.interventionSession.findUnique({
      where: {
        interventionBySchoolIdAndSessionType: {
          schoolId: selectedSchool.id,
          sessionType,
        },
      },
      include: {
        InterventionGroupReport: true,
      },
    });
  } else {
    session = await db.interventionSession.findFirst({
      where: {
        schoolId: selectedSchool.id,
      },
      include: {
        InterventionGroupReport: true,
      },
    });
  }
  const sessionName = sessionTypeToDisplayName[sessionType] ?? "Unknown";

  if (!session) {
    return (
      <div>
        <GroupReportHeader
          schoolName={schoolName}
          sessionName={sessionName}
          href={`/schools/${selectedSchool.visibleId}`}
          schoolVisibleId={selectedSchool.visibleId}
          groupName={groudId}
        />
        <div className="py-6 text-center text-sm">
          {sessionName} has not yet been conducted for this group.
        </div>
      </div>
    );
  }

  const groupEvaluation = await db.interventionGroupReport.findFirst({
    where: {
      groupId: groudId,
    },
  });

  const revalidatePath = `/schools/${selectedSchool.visibleId}/${groudId}/?type=${sessionType}`;

  return (
    <div>
      <GroupReportHeader
        schoolName={schoolName}
        sessionName={sessionName}
        href={`/schools/${selectedSchool.visibleId}`}
        schoolVisibleId={selectedSchool.visibleId}
        groupName={groudId}
      />

      <GroupEngagementRater
        revalidatePath={revalidatePath}
        sessionName={session.sessionName}
        groupName={groudId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
      />

      <GroupDisciplineRater
        revalidatePath={revalidatePath}
        sessionName={session.sessionName}
        groupName={groudId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
      />

      <GroupContentCoverage
        revalidatePath={revalidatePath}
        sessionName={session.sessionName}
        groupName={groudId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
      />
    </div>
  );
}
