import { notFound } from "next/navigation";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { db } from "#/lib/db";

import { GroupContentCoverage } from "#/app/(platform)/schools/[visibleId]/[groupId]/components/group-content-coverage";
import { GroupDisciplineRater } from "#/app/(platform)/schools/[visibleId]/[groupId]/components/group-cooperation-rater";
import { GroupEngagementRater } from "#/app/(platform)/schools/[visibleId]/[groupId]/components/group-engagement-rater";
import { GroupReportHeader } from "#/app/(platform)/schools/[visibleId]/[groupId]/components/group-report-header";
import { Prisma } from "@prisma/client";

const sessionTypeToDisplayName: {
  [key: string]: string;
} = {
  s0: "Pre session",
  s1: "Session 01",
  s2: "Session 02",
  s3: "Session 03",
  s4: "Session 04",
};

// TODO: Remove depreciated functions
export default async function GroupReport({
  searchParams,
  params,
}: {
  searchParams: { type: string };
  params: {
    visibleId: string;
    groupId: string;
  };
}) {
  const { visibleId, groupId } = params;
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
    // session = await db.interventionSession.findUnique({
    //   where: {
    //     interventionBySchoolIdAndSessionType: {
    //       schoolId: selectedSchool.id,
    //       sessionType,
    //     },
    //   },
    //   include: {
    //     InterventionGroupReport: true,
    //   },
    // });
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

  if (sessionType === "default") {
    return (
      <div>
        <GroupReportHeader
          schoolName={schoolName}
          sessionName={"Please pick a session"}
          href={`/schools/${selectedSchool.visibleId}`}
          schoolVisibleId={selectedSchool.visibleId}
          groupName={groupId}
        />
      </div>
    );
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
          groupName={groupId}
        />
        <div className="py-6 text-center text-sm">
          {sessionName} has not yet been conducted for this group.
        </div>
      </div>
    );
  }

  const revalidatePath = `/schools/${selectedSchool.visibleId}/${groupId}/?type=${sessionType}`;

  const currentSession = await db.interventionSession.findFirst({
    where: {
      sessionType: sessionType,
      schoolId: selectedSchool.id,
    },
  });

  const groupEvaluation = await db.interventionGroupReport.findFirst({
    where: {
      groupId: groupId,
      sessionId: currentSession?.id ?? null,
    },
  });

  return (
    <div>
      <GroupReportHeader
        schoolName={schoolName}
        sessionName={sessionName}
        href={`/schools/${selectedSchool.visibleId}`}
        schoolVisibleId={selectedSchool.visibleId}
        groupName={groupId}
      />

      <GroupEngagementRater
        revalidatePath={revalidatePath}
        groupName={groupId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
        sessionId={currentSession?.id}
      />

      <GroupDisciplineRater
        revalidatePath={revalidatePath}
        groupName={groupId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
        sessionId={currentSession?.id}
      />

      <GroupContentCoverage
        revalidatePath={revalidatePath}
        groupName={groupId}
        id={groupEvaluation?.id}
        ratings={groupEvaluation}
        sessionId={currentSession?.id}
      />
    </div>
  );
}
