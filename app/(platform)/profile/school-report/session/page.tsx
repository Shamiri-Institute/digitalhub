import { notFound } from "next/navigation";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { db } from "#/lib/db";
import { SessionNavigationHeader } from "./session-navigation-header";
import { SessionNotes } from "./session-notes";
import { SessionRater } from "./session-rater";
import { WeeklyReportForm } from "./weekly-report-form";

const sessionTypeToDisplayName: {
  [key: string]: string;
} = {
  s0: "Pre session",
  s1: "Session 01",
  s2: "Session 02",
  s3: "Session 03",
  s4: "Session 04",
};

export default async function ReportDetails({
  searchParams,
}: {
  searchParams: { type: string };
}) {
  const { type: sessionType } = searchParams;

  if (!sessionType) {
    notFound();
  }

  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const session = await db.interventionSession.findUnique({
    where: {
      interventionBySchoolIdAndSessionType: {
        schoolId: supervisor.assignedSchoolId,
        sessionType,
      },
    },
    include: {
      sessionRatings: true,
      sessionNotes: true,
    },
  });

  if (!session) {
    const sessionName = sessionTypeToDisplayName[sessionType] ?? "Unknown";

    return (
      <div>
        <SessionNavigationHeader
          schoolName={supervisor.assignedSchool.schoolName}
          sessionName={sessionName}
          href="/profile"
        />
        <div className="py-6 text-center text-sm">
          {sessionName} has not yet been created.
        </div>
      </div>
    );
  }

  // Session rating by the currently logged in supervisor if previously created
  const supervisorSessionRating =
    session.sessionRatings?.find(
      (sessionRating) => sessionRating.supervisorId === supervisor.id,
    ) ?? null;

  // Weekly report comments by point supervisor
  const pointSupervisorSessionNotes = session.sessionNotes?.filter(
    (sessionNote) =>
      sessionNote.supervisorId === supervisor.id &&
      [
        "positive-highlights",
        "reported-challenges",
        "recommendations",
      ].includes(sessionNote.kind),
  );

  // Added notes by all supervisors
  const allSupervisorSessionAddedNotes =
    await db.interventionSessionNote.findMany({
      where: {
        sessionId: session.id,
        kind: "added-notes",
      },
      orderBy: { createdAt: "desc" },
      include: { supervisor: true },
    });

  const revalidatePath = `/profile/school-report/session?type=${sessionType}`;

  return (
    <div>
      <SessionNavigationHeader
        schoolName={supervisor.assignedSchool.schoolName}
        sessionName={session.sessionName}
        href="/profile"
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
      />
      <WeeklyReportForm
        revalidatePath={revalidatePath}
        sessionId={session.id}
        supervisorId={supervisor.id}
        pointSupervisor={supervisor}
        notes={pointSupervisorSessionNotes}
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
