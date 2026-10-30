"use client";

import type { ScheduleSupervisor } from "#/lib/actions/schedule-data";
import { ImplementerRole } from "#/db/enums";
import { type SetStateAction, useState } from "react";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import FellowAttendance from "#/components/common/fellow/fellow-attendance";
import CancelSession from "#/components/common/session/cancel-session";
import { columns, type SessionData } from "#/components/common/session/columns";
import RescheduleSession from "#/components/common/session/reschedule-session";
import {
  SessionDetail,
  type SessionDialogKind,
  type SessionDialogOpener,
} from "#/components/common/session/session-list";
import SessionRatings from "#/components/common/session/session-ratings";
import StudentAttendance, {
  startStudentAttendanceOpening,
  type StudentAttendanceOpening,
} from "#/components/common/student/student-attendance";
import AttendanceDocumentDialog from "#/components/common/student/student-attendance-files/attendance-document-dialog";
import SupervisorAttendance from "#/components/common/supervisor/supervisor-attendance";
import DataTable from "#/components/data-table";

type OpenSessionDialog =
  | { kind: Exclude<SessionDialogKind, "studentAttendance">; sessionId: string }
  | { kind: "studentAttendance"; sessionId: string; opening: StudentAttendanceOpening };

export default function SessionsDatatable({
  sessions,
  supervisors,
  fellowRatings,
  role,
  fellowId,
  supervisorId,
}: {
  sessions: SessionData[];
  supervisors?: ScheduleSupervisor[];
  fellowRatings?: {
    id: string;
    averageRating: number | null;
  }[];
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const [dialog, setDialog] = useState<OpenSessionDialog | null>(null);
  const session = dialog && sessions.find((s) => s.id === dialog.sessionId);

  const openDialog: SessionDialogOpener = (kind, { id: sessionId }) => {
    setDialog(
      kind === "studentAttendance"
        ? { kind, sessionId, opening: startStudentAttendanceOpening(sessionId, role) }
        : { kind, sessionId },
    );
  };

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const leaderIds = new Set(session?.school?.interventionGroups?.map((g) => g.leaderId) ?? []);
  const allFellows = supervisors?.flatMap((s) => s.fellows) ?? [];
  const fellowsForStudentAttendance =
    role === ImplementerRole.SUPERVISOR && supervisorId
      ? (supervisors?.find((s) => s.id === supervisorId)?.fellows ?? [])
      : allFellows.filter((f) => leaderIds.has(f.id));

  return (
    <>
      <DataTable
        urlState
        data={sessions}
        columns={columns({
          openDialog,
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
            id={session.id}
            defaultOccurrence={session.occurred}
            isOpen={dialog?.kind === "sessionOccurrence"}
            setIsOpen={onDialogOpenChange}
            sessions={sessions}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </MarkSessionOccurrence>
          <StudentAttendance
            isOpen={dialog?.kind === "studentAttendance"}
            setIsOpen={onDialogOpenChange}
            role={role}
            session={session}
            opening={dialog?.kind === "studentAttendance" ? dialog.opening : null}
            fellows={fellowsForStudentAttendance}
            fellowId={fellowId}
          />
          {session.schoolId !== null && session.school && (
            <SessionRatings
              open={dialog?.kind === "ratings"}
              onOpenChange={onDialogOpenChange}
              mode={
                role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
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
            open={dialog?.kind === "reschedule"}
            onOpenChange={onDialogOpenChange}
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
            open={dialog?.kind === "cancel"}
            onOpenChange={onDialogOpenChange}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </CancelSession>
          {fellowRatings ? (
            <FellowAttendance
              supervisors={supervisors}
              fellowRatings={fellowRatings}
              role={role}
              session={session}
              isOpen={dialog?.kind === "fellowAttendance"}
              setIsOpen={onDialogOpenChange}
              supervisorId={supervisorId}
            />
          ) : null}
          <AttendanceDocumentDialog
            session={session}
            fellowId={fellowId}
            role={role}
            open={dialog?.kind === "attendanceDocument"}
            onOpenChange={onDialogOpenChange}
          />
          <SupervisorAttendance
            supervisors={supervisors}
            role={role}
            isOpen={dialog?.kind === "supervisorAttendance"}
            setIsOpen={onDialogOpenChange}
            session={session}
          />
        </>
      )}
    </>
  );
}
