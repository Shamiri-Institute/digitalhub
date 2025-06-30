"use client";

import SupervisorAttendance, {
  type SupervisorAttendanceTableData,
} from "#/app/(platform)/hc/components/supervisor-attendance";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import FellowAttendance from "#/components/common/fellow/fellow-attendance";
import CancelSession from "#/components/common/session/cancel-session";
import { columns, type SessionData } from "#/components/common/session/columns";
import RescheduleSession from "#/components/common/session/reschedule-session";
import { SessionDetail } from "#/components/common/session/session-list";
import SessionRatings from "#/components/common/session/session-ratings";
import type { Session } from "#/components/common/session/sessions-provider";
import StudentAttendance from "#/components/common/student/student-attendance";
import DataTable from "#/components/data-table";
import { ImplementerRole, type Prisma } from "@prisma/client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useState } from "react";

export default function SessionsDatatable({
  sessions,
  supervisors,
  fellowRatings,
  role,
  fellowId,
  supervisorId,
}: {
  sessions: SessionData[];
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
      fellows: {
        include: {
          fellowAttendances: true;
          groups: true;
        };
      };
      assignedSchools: true;
    };
  }>[];
  fellowRatings?: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const pathname = usePathname();
  const [_sessions, setSessions] = useState(sessions);
  const [supervisorAttendanceDialog, setSupervisorAttendanceDialog] =
    React.useState(false);
  const [fellowAttendanceDialog, setFellowAttendanceDialog] =
    React.useState(false);
  const [cancelSessionDialog, setCancelSessionDialog] = React.useState(false);
  const [rescheduleSessionDialog, setRescheduleSessionDialog] =
    React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [markAttendanceDialog, setMarkAttendanceDialog] = React.useState(false);
  const [supervisorAttendance, setSupervisorAttendance] =
    React.useState<SupervisorAttendanceTableData | null>(null);
  const [studentAttendanceDialog, setStudentAttendanceDialog] =
    React.useState(false);
  const [sessionOccurrenceDialog, setSessionOccurrenceDialog] =
    useState<boolean>(false);

  return (
    <>
      <DataTable
        data={sessions}
        columns={columns({
          setSession,
          setRatingsDialog,
          setFellowAttendanceDialog,
          setSupervisorAttendanceDialog,
          setStudentAttendanceDialog,
          setSessionOccurrenceDialog,
          setRescheduleSessionDialog,
          setCancelSessionDialog,
          role,
          fellowId,
          supervisorId,
        })}
        className={"data-table data-table-action lg:mt-4"}
        emptyStateMessage="No sessions found for this school"
      />
      {session && (
        <>
          <MarkSessionOccurrence
            id={session?.id}
            defaultOccurrence={session?.occurred}
            isOpen={sessionOccurrenceDialog}
            setIsOpen={setSessionOccurrenceDialog}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </MarkSessionOccurrence>
          <StudentAttendance
            isOpen={studentAttendanceDialog}
            setIsOpen={setStudentAttendanceDialog}
            role={role}
            session={sessions.find((x) => x.id === session.id)!}
            fellows={
              supervisors?.find((supervisor) => supervisor.id === supervisorId)
                ?.fellows ?? []
            }
            fellowId={fellowId}
          />
          {session.schoolId !== null && session.school && (
            <SessionRatings
              open={ratingsDialog}
              onOpenChange={setRatingsDialog}
              mode={
                role === ImplementerRole.HUB_COORDINATOR
                  ? "view"
                  : role === ImplementerRole.SUPERVISOR
                    ? "add"
                    : undefined
              }
              selectedSession={session}
              role={role}
              supervisors={supervisors}
              supervisorId={supervisorId}
            >
              <SessionDetail
                state={{ session }}
                layout={"compact"}
                withDropdown={false}
                role={role}
              />
            </SessionRatings>
          )}
          <RescheduleSession
            session={session}
            open={rescheduleSessionDialog}
            onOpenChange={setRescheduleSessionDialog}
            role={role}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </RescheduleSession>
          <CancelSession
            sessionId={session.id}
            open={cancelSessionDialog}
            onOpenChange={setCancelSessionDialog}
            role={role}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </CancelSession>
        </>
      )}
      {fellowRatings ? (
        <FellowAttendance
          supervisors={supervisors}
          fellowRatings={fellowRatings}
          role={role}
          session={session}
          isOpen={fellowAttendanceDialog}
          setIsOpen={setFellowAttendanceDialog}
          supervisorId={supervisorId}
        />
      ) : null}
      <SupervisorAttendance
        supervisors={supervisors}
        role={role}
        isOpen={supervisorAttendanceDialog}
        setIsOpen={setSupervisorAttendanceDialog}
        session={session}
      />
    </>
  );
}
