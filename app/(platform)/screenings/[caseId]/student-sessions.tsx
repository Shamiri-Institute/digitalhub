import { AddClinicalSessionDialog } from "#/app/(platform)/screenings/[caseId]/components/add-clinical-session";
import { DeleteClinicalSessionDateDialog } from "#/app/(platform)/screenings/[caseId]/components/delete-session-attendance";
import { EditClinicalSessionDateDialog } from "#/app/(platform)/screenings/[caseId]/components/edit-clinical-session-dialogue";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { ClinicalSessionAttendance } from "@prisma/client";

type SessionsType = ClinicalSessionAttendance;

export function Sessions({
  caseId,
  sessions,
  supervisorId,
}: {
  caseId: string;
  sessions: SessionsType[];
  supervisorId: string;
}) {
  return (
    <div className="flex flex-col">
      <Card className="my-2 w-full gap-5 bg-white p-4 pr-3.5">
        <div className="mb-2 flex flex-1 justify-between text-base font-medium text-muted-foreground">
          <p className="flex-1">No.</p>
          <p className="flex-1">Created</p>
          <p className="flex-1">Session</p>
          <p className="flex-1">Session Date</p>
          <p className="flex-1 text-right">Updated</p>
        </div>
        <Separator />
        <>
          {sessions.map((session, index) => (
            <SessionsCard
              key={session.id}
              sessionId={session.id}
              id={index}
              session={session.session}
              date={session.date}
              createdAt={session.createdAt}
              updatedAt={session.updatedAt}
              caseId={caseId}
            />
          ))}
        </>

        {sessions.length === 0 && (
          <p className="mt-2 text-center text-sm text-brand">
            No sessions attended
          </p>
        )}
      </Card>
      <div className="flex justify-end">
        <AddClinicalSessionDialog caseId={caseId} supervisorId={supervisorId}>
          <Button variant="brand" className="w-fit">
            Add
          </Button>
        </AddClinicalSessionDialog>
      </div>
    </div>
  );
}

function SessionsCard({
  sessionId,
  id,
  session,
  date,
  createdAt,
  updatedAt,
  caseId,
}: {
  sessionId: string;
  id: number;
  session: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  caseId: string;
}) {
  return (
    <div className="border-b pb-1 last:border-none">
      <div className="mt-2 flex flex-col text-sm text-brand sm:flex-row">
        <p className="flex-1">{id + 1}.</p>
        <p className="flex-1">{new Date(createdAt).toLocaleDateString()}</p>
        <p className="flex-1">{session}</p>
        <p className="flex-1">{new Date(date).toLocaleDateString()}</p>
        <p className="flex-1 text-left sm:text-right">
          {new Date(updatedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-1 justify-end">
        <DeleteClinicalSessionDateDialog sessionId={sessionId} caseId={caseId}>
          <Button variant="destructive" className="mr-3 mt-1 w-fit">
            Delete
          </Button>
        </DeleteClinicalSessionDateDialog>

        <EditClinicalSessionDateDialog
          sessionId={sessionId}
          session={session}
          date={date}
          caseId={caseId}
        >
          <Button variant="default" className="mt-1 w-fit">
            Edit
          </Button>
        </EditClinicalSessionDateDialog>
      </div>
    </div>
  );
}
