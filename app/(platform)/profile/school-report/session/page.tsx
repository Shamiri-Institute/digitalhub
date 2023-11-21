import { notFound } from "next/navigation";
import { z } from "zod";

import { AddNoteDialog } from "#/app/(platform)/profile/school-report/session/add-note-dialogue";
import { currentSupervisor } from "#/app/auth";
import { Button } from "#/components/ui/button";
import { db } from "#/lib/db";
import { SessionNavigationHeader } from "./session-navigation-header";
import { SessionRater } from "./session-rater";
import { WeeklyReportForm } from "./weekly-report-form";

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
      findInterventionBySchoolAndSessionType: {
        schoolId: supervisor.assignedSchoolId,
        sessionType,
      },
    },
  });

  if (!session) {
    return (
      <div>
        <SessionNavigationHeader
          schoolName={supervisor.assignedSchool.schoolName}
          sessionName="Session 01"
        />
        <div className="py-6 text-center text-sm">
          Session has not yet been created.
        </div>
      </div>
    );
  }

  return (
    <div>
      <SessionNavigationHeader
        schoolName={supervisor.assignedSchool.schoolName}
        sessionName={session.sessionName}
      />
      <SessionRater />
      <WeeklyReportForm pointSupervisor={supervisor} />
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

export const FormSchema = z.object({
  positiveHighlight: z.string({
    required_error: "Please enter the positive highlights.",
  }),
  reportedChallenge: z.string({
    required_error: "Please enter the reported challenges.",
  }),
  recommendations: z.string({
    required_error: "Please enter the recommendations.",
  }),
});

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
