import { AddClinicalSessionDialog } from "#/app/(platform)/screenings/[caseId]/components/add-clinical-session";
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
      <Card className="pr-3.5bg-white  my-2 gap-5 p-4">
        <div className="mb-2 flex justify-between">
          <p className="text-base font-medium text-muted-foreground">No.</p>
          <p className="text-base font-medium text-muted-foreground">
            Session Attended
          </p>
          <p className="text-base font-medium text-muted-foreground">Date</p>
        </div>
        <Separator />
        <>
          {sessions.map((session, index) => (
            <SessionsCard
              key={session.id}
              id={index}
              session={session.session}
              date={session.date}
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
  id,
  session,
  date,
}: {
  id: number;
  session: string;
  date: Date;
}) {
  return (
    <div className="mt-2 flex  items-center justify-between border-b last:border-none">
      <p className="flex-1 text-left text-sm text-brand ">{id + 1}</p>
      <p className="flex-1 text-center text-sm  text-brand">{session}</p>
      <p className="flex-1 text-right text-sm  text-brand">
        {new Date(date).toLocaleDateString()}
      </p>
    </div>
  );
}
