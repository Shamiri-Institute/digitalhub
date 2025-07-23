import { notFound } from "next/navigation";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { SessionNavigationHeader } from "#/components/old/profile/school-report/session/session-navigation-header";
import { SessionNotes } from "#/components/old/profile/school-report/session/session-notes";
import { SessionRater } from "#/components/old/profile/school-report/session/session-rater";
import { WeeklyReportForm } from "#/components/old/profile/school-report/session/weekly-report-form";
import { db } from "#/lib/db";

const sessionTypeToDisplayName: {
  [key: string]: string;
} = {
  s0: "Pre session",
  s1: "Session 01",
  s2: "Session 02",
  s3: "Session 03",
  s4: "Session 04",
};

export default async function ReportDetails(props: {
  searchParams: Promise<{ type: string }>;
  params: Promise<{ schoolId: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { type: sessionType } = searchParams;
  const { schoolId } = params;

  if (!sessionType) {
    notFound();
  }

  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole userRole="supervisor" />;
  }

  const session = await db.interventionSession.findFirst({
    where: {
      schoolId,
      sessionType,
    },
    include: {
      sessionRatings: true,
      sessionNotes: true,

      school: {
        select: {
          schoolName: true,
          assignedSupervisor: true,
        },
      },
    },
  });

  const schoolNotAssigned = supervisor.assignedSchools?.every((school) => school.id !== schoolId);
  const pointSupervisor = session?.school?.assignedSupervisor ?? undefined;
  const schoolName = session?.school?.schoolName ?? "";

  if (!session) {
    const sessionName = sessionTypeToDisplayName[sessionType] ?? "Unknown";

    return (
      <div>
        <SessionNavigationHeader
          schoolName={schoolName}
          sessionName={sessionName}
          href="/schools"
          schoolVisibleId={schoolId}
        />
        <div className="py-6 text-center text-sm">{sessionName} has not yet been created.</div>
      </div>
    );
  }

  // Session rating by the currently logged in supervisor if previously created
  const supervisorSessionRating =
    session.sessionRatings?.find((sessionRating) => sessionRating.supervisorId === supervisor.id) ??
    null;

  // Weekly report comments by point supervisor
  const pointSupervisorSessionNotes = session.sessionNotes?.filter(
    (sessionNote) =>
      sessionNote.supervisorId === supervisor.id &&
      ["positive-highlights", "reported-challenges", "recommendations"].includes(sessionNote.kind),
  );

  // Added notes by all supervisors
  const allSupervisorSessionAddedNotes = await db.interventionSessionNote.findMany({
    where: {
      sessionId: session.id,
      kind: "added-notes",
    },
    orderBy: { createdAt: "desc" },
    include: { supervisor: true },
  });

  const revalidatePath = `/schools/session-report/${schoolId}?type=${sessionType}`;

  return (
    <div>
      <SessionNavigationHeader
        schoolName={session?.school?.schoolName ?? ""}
        sessionName={session.sessionName!}
        href="/schools"
        schoolVisibleId={schoolId}
      />
      <SessionRater
        revalidatePath={revalidatePath}
        sessionId={session.id}
        supervisorId={supervisor.id}
        ratings={{
          studentBehavior: supervisorSessionRating?.studentBehaviorRating ?? 0,
          adminSupport: supervisorSessionRating?.adminSupportRating ?? 0,
          workload: supervisorSessionRating?.workloadRating ?? 0,
        }}
        schoolNotAssigned={schoolNotAssigned}
      />
      <WeeklyReportForm
        revalidatePath={revalidatePath}
        sessionId={session.id}
        supervisorId={supervisor.id}
        pointSupervisor={pointSupervisor}
        notes={pointSupervisorSessionNotes}
        schoolNotAssigned={schoolNotAssigned}
      />
      <SessionNotes
        revalidatePath={revalidatePath}
        sessionId={session.id}
        supervisorId={supervisor.id}
        notes={allSupervisorSessionAddedNotes}
      />
    </div>
  );
}
