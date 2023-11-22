import { notFound } from "next/navigation";

import { AddNoteDialog } from "#/app/(platform)/profile/school-report/session/add-note-dialogue";
import { currentSupervisor } from "#/app/auth";
import { Button } from "#/components/ui/button";
import { db } from "#/lib/db";
import { SessionNavigationHeader } from "./session-navigation-header";
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
  const pointSupervisorSessionNotes =
    session.sessionNotes?.filter(
      (sessionNote) =>
        sessionNote.supervisorId === supervisor.id &&
        [
          "positive-higlhights",
          "reported-challenges",
          "recommendations",
        ].includes(sessionNote.kind),
    ) ?? null;

  const revalidatePath = `/profile/school-report/session?type=${sessionType}`;

  return (
    <div>
      <SessionNavigationHeader
        schoolName={supervisor.assignedSchool.schoolName}
        sessionName={session.sessionName}
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
      <SessionNotes />
    </div>
  );
}

export const sessionRatingOptions = [
  { sessionLabel: "Pre session", sessionType: "s0" },
  { sessionLabel: "Session 01", sessionType: "s1" },
  { sessionLabel: "Session 02", sessionType: "s2" },
  { sessionLabel: "Session 03", sessionType: "s3" },
  { sessionLabel: "Session 04", sessionType: "s4" },
];

function SessionNotes() {
  return (
    <div className="flex flex-col">
      <div className="mt-4 flex items-center justify-between pl-2 pr-8">
        <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
          Added Notes
        </h3>
      </div>
      <div className="my-4 flex pl-2 pr-8">
        <div>
          <h3 className="ml-6 mt-4 text-sm font-semibold text-muted-foreground">
            Supervisor Name
          </h3>
        </div>

        <div>
          <p className="ml-6 mt-4 text-sm font-normal text-brand">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet
            veniam autem pariatur? Placeat dolorem laborum, facilis error
            distinctio ea in optio libero quidem dicta voluptates quia,
            consequuntur sed saepe blanditiis?
          </p>
          <div className="mt-5  flex items-center justify-center">
            <p className="text-brand-light-gray text-xs font-normal">
              March 20
            </p>
            <div className="mx-2 h-6 w-0.5 bg-border/50 " />
            <p className="text-brand-light-gray text-xs font-normal ">4:18pm</p>
          </div>

          <AddNoteDialog>
            <Button
              type="submit"
              className="mt-4 w-full bg-shamiri-blue hover:bg-brand"
            >
              Add Note
            </Button>
          </AddNoteDialog>
        </div>
      </div>
    </div>
  );
}
