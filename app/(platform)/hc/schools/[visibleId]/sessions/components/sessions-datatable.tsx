"use client";

import CancelSession from "#/app/(platform)/hc/components/cancel-session";
import FellowAttendance from "#/app/(platform)/hc/components/fellow-attendance";
import RescheduleSession from "#/app/(platform)/hc/components/reschedule-session";
import SupervisorAttendance, {
  SupervisorAttendanceTableData,
} from "#/app/(platform)/hc/components/supervisor-attendance";
import { CancelSessionContext } from "#/app/(platform)/hc/context/cancel-session-dialog-context";
import { FellowAttendanceContext } from "#/app/(platform)/hc/context/fellow-attendance-dialog-context";
import { RescheduleSessionContext } from "#/app/(platform)/hc/context/reschedule-session-dialog-context";
import { SupervisorAttendanceContext } from "#/app/(platform)/hc/context/supervisor-attendance-dialog-context";
import {
  columns,
  SessionData,
} from "#/app/(platform)/hc/schools/[visibleId]/sessions/components/columns";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import SessionRatings from "#/components/common/session/session-ratings";
import type { Session } from "#/components/common/session/sessions-provider";
import DataTable from "#/components/data-table";
import { ImplementerRole, Prisma } from "@prisma/client";
import { addHours } from "date-fns";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useState } from "react";

export default function SessionsDatatable({
  sessions,
  supervisors,
  fellowRatings,
  role,
}: {
  sessions: SessionData[];
  supervisors: Prisma.SupervisorGetPayload<{
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
  fellowRatings: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
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
  const [session, setSession] =
    React.useState<Prisma.InterventionSessionGetPayload<{
      include: { school: true; sessionRatings: true };
    }> | null>(null);
  const [activeSession, setActiveSession] = useState<Session | undefined>();
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [markAttendanceDialog, setMarkAttendanceDialog] = React.useState(false);
  const [supervisorAttendance, setSupervisorAttendance] =
    React.useState<SupervisorAttendanceTableData | null>(null);

  function updateRescheduledSessionState(sessionDate: Date) {
    const sessionIndex =
      session !== null
        ? sessions.findIndex((_session) => {
            return _session.id === session.id;
          })
        : -1;

    const copiedSessions = [...sessions];
    if (sessionIndex !== -1 && copiedSessions[sessionIndex] !== undefined) {
      copiedSessions[sessionIndex]!.sessionDate = sessionDate;

      copiedSessions[sessionIndex]!.sessionEndTime = addHours(sessionDate, 1);
      copiedSessions[sessionIndex]!.status = "Rescheduled";
      setSessions(copiedSessions);
    }

    return revalidatePageAction(pathname);
  }

  function updateCancelledSessionState() {
    const sessionIndex =
      session !== null
        ? sessions.findIndex((_session) => {
            return _session.id === session.id;
          })
        : -1;

    const copiedSessions = [...sessions];
    if (sessionIndex !== -1 && copiedSessions[sessionIndex] !== undefined) {
      copiedSessions[sessionIndex]!.status = "Cancelled";
      setSessions(copiedSessions);
    }

    return revalidatePageAction(pathname);
  }

  return (
    <SupervisorAttendanceContext.Provider
      value={{
        isOpen: supervisorAttendanceDialog,
        setIsOpen: setSupervisorAttendanceDialog,
        session,
        setSession,
        markAttendanceDialog,
        setMarkAttendanceDialog,
        attendance: supervisorAttendance,
        setAttendance: setSupervisorAttendance,
      }}
    >
      <FellowAttendanceContext.Provider
        value={{
          isOpen: fellowAttendanceDialog,
          setIsOpen: setFellowAttendanceDialog,
          session,
          setSession,
        }}
      >
        <CancelSessionContext.Provider
          value={{
            isOpen: cancelSessionDialog,
            setIsOpen: setCancelSessionDialog,
            session,
            setSession,
          }}
        >
          <RescheduleSessionContext.Provider
            value={{
              isOpen: rescheduleSessionDialog,
              setIsOpen: setRescheduleSessionDialog,
              session,
              setSession,
            }}
          >
            <DataTable
              data={_sessions}
              columns={columns({
                setSession: setActiveSession,
                setRatingsDialog,
                role,
              })}
              className={"data-table data-table-action mt-4"}
              emptyStateMessage="No sessions found for this school"
            />
            {activeSession && (
              <SessionRatings
                schoolId={activeSession.schoolId}
                open={ratingsDialog}
                onOpenChange={setRatingsDialog}
                ratings={activeSession.sessionRatings.map((rating) => {
                  const { sessionRatings, ..._session } = activeSession;
                  return {
                    ...rating,
                    session: _session,
                  };
                })}
                mode="view"
              >
                <DialogAlertWidget label={activeSession.school.schoolName} />
              </SessionRatings>
            )}
            <RescheduleSession
              updateSessionsState={updateRescheduledSessionState}
              role={role}
            />
          </RescheduleSessionContext.Provider>
          <CancelSession
            updateSessionsState={updateCancelledSessionState}
            role={role}
          />
        </CancelSessionContext.Provider>
        <FellowAttendance
          supervisors={supervisors}
          fellowRatings={fellowRatings}
          role={role}
        />
      </FellowAttendanceContext.Provider>
      <SupervisorAttendance supervisors={supervisors} role={role} />
    </SupervisorAttendanceContext.Provider>
  );
}
