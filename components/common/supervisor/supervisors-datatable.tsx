"use client";

import { ImplementerRole, type Prisma } from "@prisma/client";
import type { Row } from "@tanstack/react-table";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useMemo, useState } from "react";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { columns, type SupervisorsData } from "#/components/common/supervisor/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { markManySupervisorAttendance, markSupervisorAttendance } from "#/lib/actions/supervisor";

export default function SupervisorsDataTable({
  supervisors,
  role,
  school,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
    };
  }>[];
  role: ImplementerRole;
  school: Prisma.SchoolGetPayload<{
    include: {
      interventionSessions: {
        include: {
          session: true;
        };
      };
    };
  }> | null;
}) {
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Row<SupervisorsData>[]>([]);
  const [markAttendanceDialog, setMarkAttendanceDialog] = useState<boolean>(false);
  const [selectedSession] = useState<string>();
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorsData | null>(null);

  const supervisor = useMemo(() => {
    if (supervisors.length > 0 && selectedSupervisor) {
      return supervisors.find((s) => s.id === selectedSupervisor?.id) ?? null;
    }
    return selectedSupervisor;
  }, [supervisors, selectedSupervisor]);

  const memoizedColumns = useMemo(() => {
    return columns({
      setMarkAttendanceDialog,
      sessions: school?.interventionSessions ?? [],
      setSupervisor: setSelectedSupervisor,
      role,
    });
  }, [role, school?.interventionSessions]);

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        {role === ImplementerRole.HUB_COORDINATOR && (
          <Button
            variant="outline"
            className="flex gap-1"
            disabled={
              (school?.droppedOut !== null && school?.droppedOut) || selectedRows.length === 0
            }
            onClick={() => {
              setBatchMode(true);
              setMarkAttendanceDialog(true);
            }}
          >
            <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
            <span>Mark supervisor attendance</span>
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      <DataTable
        data={supervisors}
        columns={memoizedColumns}
        className={"data-table data-table-action lg:mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          Gender: false,
          "Phone number": false,
          Status: false,
          checkbox: role === ImplementerRole.HUB_COORDINATOR,
          button: role === ImplementerRole.HUB_COORDINATOR,
        }}
        renderTableActions={renderTableActions()}
        enableRowSelection={(row: Row<SupervisorsData>) =>
          row.original.droppedOut === null || !row.original.droppedOut
        }
        rowSelectionDescription={"supervisors"}
        onRowSelectionChange={setSelectedRows}
      />
      {supervisor && (
        <DropoutSupervisor
          supervisorId={supervisor.id}
          setDropoutDialog={() => {}}
          dropoutDialog={false}
        >
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{supervisor?.supervisorName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
              <span>
                {supervisor?.cellNumber &&
                  parsePhoneNumberFromString(supervisor?.cellNumber, "KE")?.formatNational()}
              </span>
            </div>
          </DialogAlertWidget>
        </DropoutSupervisor>
      )}
      <UndropSupervisor
        supervisorId={supervisor !== null ? supervisor.id : undefined}
        setUndropDialog={() => {}}
        undropDialog={false}
      >
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{supervisor?.supervisorName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
            <span>
              {supervisor?.cellNumber &&
                parsePhoneNumberFromString(supervisor?.cellNumber, "KE")?.formatNational()}
            </span>
          </div>
        </DialogAlertWidget>
      </UndropSupervisor>
      <MarkAttendance
        title={"Mark supervisor attendance"}
        sessions={school?.interventionSessions.filter((session) => session.occurred) ?? []}
        selectedSessionId={selectedSession}
        attendances={
          supervisor?.supervisorAttendances.map((attendance) => {
            const {
              id,
              supervisorId,
              attended,
              absenceReason,
              sessionId,
              absenceComments,
              session,
            } = attendance;
            return {
              attendanceId: id.toString(),
              id: supervisorId,
              attended,
              absenceReason,
              sessionId,
              schoolId: session.schoolId,
              comments: absenceComments,
            };
          }) ?? []
        }
        id={supervisor?.id}
        isOpen={markAttendanceDialog}
        setIsOpen={setMarkAttendanceDialog}
        markAttendanceAction={markSupervisorAttendance}
        bulkMode={batchMode}
        setBulkMode={setBatchMode}
        markBulkAttendanceAction={markManySupervisorAttendance}
        selectedIds={selectedRows.map((x): string => x.original.id)}
      >
        <DialogAlertWidget>
          <div className="flex flex-wrap items-center gap-2">
            {batchMode ? (
              <span>{selectedRows.length} supervisors</span>
            ) : (
              <span>{supervisor?.supervisorName}</span>
            )}
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
            <span>{school?.schoolName}</span>
          </div>
        </DialogAlertWidget>
      </MarkAttendance>
    </div>
  );
}
