"use client";

import { ImplementerRole } from "#/db/enums";
import type { interventionSession, school as schoolTable, sessionName } from "#/db/schema";
import type { Row, RowSelectionState } from "@tanstack/react-table";
import { type SetStateAction, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { columns, type SupervisorsData } from "#/components/common/supervisor/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { markManySupervisorAttendance, markSupervisorAttendance } from "#/lib/actions/supervisor";

// Marking the selected supervisors reads them from the table's row selection.
type OpenSupervisorDialog =
  | { kind: "markAttendance"; supervisorId: string }
  | { kind: "markSelectedAttendance" };

export default function SupervisorsDataTable({
  supervisors,
  role,
  school,
}: {
  supervisors: SupervisorsData[];
  role: ImplementerRole;
  school:
    | (typeof schoolTable.$inferSelect & {
        interventionSessions: (typeof interventionSession.$inferSelect & {
          session: typeof sessionName.$inferSelect | null;
        })[];
      })
    | null;
}) {
  const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<RowSelectionState>({});
  const selectedSupervisors = supervisors.filter((s) => selectedSupervisorIds[s.id]);
  const [dialog, setDialog] = useState<OpenSupervisorDialog | null>(null);
  const supervisor =
    dialog?.kind === "markAttendance"
      ? supervisors.find((s) => s.id === dialog.supervisorId)
      : undefined;
  const markingSelected = dialog?.kind === "markSelectedAttendance";

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        {role === ImplementerRole.HUB_COORDINATOR && (
          <Button
            variant="outline"
            className="flex gap-1"
            disabled={
              (school?.droppedOut !== null && school?.droppedOut) ||
              selectedSupervisors.length === 0
            }
            onClick={() => setDialog({ kind: "markSelectedAttendance" })}
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
        columns={columns({
          openMarkAttendance: ({ id: supervisorId }) =>
            setDialog({ kind: "markAttendance", supervisorId }),
          sessions: school?.interventionSessions ?? [],
        })}
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
        getRowId={(s) => s.id}
        rowSelection={selectedSupervisorIds}
        onRowSelectionChange={setSelectedSupervisorIds}
      />
      <MarkAttendance
        title={"Mark supervisor attendance"}
        sessions={school?.interventionSessions.filter((session) => session.occurred) ?? []}
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
        isOpen={dialog !== null}
        setIsOpen={onDialogOpenChange}
        markAttendanceAction={markSupervisorAttendance}
        bulkMode={markingSelected}
        markBulkAttendanceAction={markManySupervisorAttendance}
        selectedIds={selectedSupervisors.map((s) => s.id)}
        onSuccess={() => setSelectedSupervisorIds({})}
      >
        <DialogAlertWidget>
          <div className="flex flex-wrap items-center gap-2">
            {markingSelected ? (
              <span>{selectedSupervisors.length} supervisors</span>
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
