"use client";

import { ImplementerRole, type Prisma } from "@prisma/client";
import * as React from "react";
import { useEffect, useState } from "react";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import FellowAttendance from "#/components/common/fellow/fellow-attendance";
import CancelSession from "#/components/common/session/cancel-session";
import { columns, type SessionData } from "#/components/common/session/columns";
import RescheduleSession from "#/components/common/session/reschedule-session";
import { SessionDetail } from "#/components/common/session/session-list";
import SessionRatings from "#/components/common/session/session-ratings";
import type { Session } from "#/components/common/session/sessions-provider";
import StudentAttendance from "#/components/common/student/student-attendance";
import UploadAttendanceDocumentDialog from "#/components/common/student/student-attendance-files/upload-attendance-dialog";
import ViewAttendanceDocument from "#/components/common/student/student-attendance-files/view-attendance-document";
import SupervisorAttendance from "#/components/common/supervisor/supervisor-attendance";
import DataTable from "#/components/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";

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
          groups: {
            include: {
              _count: {
                select: {
                  students: true;
                };
              };
            };
          };
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
  const [supervisorAttendanceDialog, setSupervisorAttendanceDialog] = React.useState(false);
  const [fellowAttendanceDialog, setFellowAttendanceDialog] = React.useState(false);
  const [cancelSessionDialog, setCancelSessionDialog] = React.useState(false);
  const [rescheduleSessionDialog, setRescheduleSessionDialog] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [studentAttendanceDialog, setStudentAttendanceDialog] = React.useState(false);
  const [sessionOccurrenceDialog, setSessionOccurrenceDialog] = useState<boolean>(false);
  const [uploadAttendanceDialog, setUploadAttendanceDialog] = React.useState(false);
  const [viewAttendanceDialog, setViewAttendanceDialog] = React.useState(false);

  const groupId = session?.school?.interventionGroups?.find((g) => g.leaderId === fellowId)?.id;

  const leaderIds = new Set(session?.school?.interventionGroups?.map((g) => g.leaderId) ?? []);
  const allFellows = supervisors?.flatMap((s) => s.fellows) ?? [];
  const fellowsForStudentAttendance =
    role === ImplementerRole.SUPERVISOR && supervisorId
      ? (supervisors?.find((s) => s.id === supervisorId)?.fellows ?? [])
      : allFellows.filter((f) => leaderIds.has(f.id));

  useEffect(() => {
    if (sessions.length > 0) {
      setSession(sessions.find((s) => s.id === session?.id) ?? null);
    }
  }, [sessions, session?.id]);

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
          setUploadAttendanceDialog,
          setViewAttendanceDialog,
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
            session={session}
            fellows={fellowsForStudentAttendance}
            fellowId={fellowId}
          />
          {session.schoolId !== null && session.school && (
            <SessionRatings
              open={ratingsDialog}
              onOpenChange={setRatingsDialog}
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
      <UploadAttendanceDocumentDialog
        session={session}
        groupId={groupId}
        role={role}
        open={uploadAttendanceDialog}
        onOpenChange={setUploadAttendanceDialog}
      />
      <Dialog open={viewAttendanceDialog} onOpenChange={setViewAttendanceDialog}>
        <DialogContent className="flex h-[90vh] w-[90vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Attendance Document</DialogTitle>
          </DialogHeader>
          {session && groupId && (
            <div className="flex-1 overflow-hidden">
              <ViewAttendanceDocument
                sessionId={session.id}
                groupId={groupId}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
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
