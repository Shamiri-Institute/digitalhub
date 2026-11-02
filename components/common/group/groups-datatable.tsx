"use client";

import type {
  fellow,
  interventionSession,
  school as schoolTable,
  sessionName,
  supervisor,
} from "#/db/schema";
import { ImplementerRole } from "#/db/enums";
import { type SetStateAction, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import ArchiveGroup from "#/components/common/group/archive-group";
import {
  columns,
  type GroupDialogKind,
  type SchoolGroupDataTableData,
} from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import UnarchiveGroup from "#/components/common/group/unarchive-group";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";

type OpenGroupDialog = { kind: GroupDialogKind; groupId: string };

export default function GroupsDataTable({
  data,
  school,
  supervisors,
  role,
}: {
  data: SchoolGroupDataTableData[];
  school: typeof schoolTable.$inferSelect & {
    interventionSessions: (typeof interventionSession.$inferSelect & {
      session: typeof sessionName.$inferSelect | null;
    })[];
  };
  supervisors?: (Pick<typeof supervisor.$inferSelect, "id" | "supervisorName"> & {
    fellows: Pick<typeof fellow.$inferSelect, "id" | "fellowName" | "droppedOut">[];
  })[];
  role: ImplementerRole;
}) {
  const [dialog, setDialog] = useState<OpenGroupDialog | null>(null);
  const group = dialog && data.find((g) => g.id === dialog.groupId);

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const renderTableActions = () => {
    return (
      (role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR) &&
      supervisors && (
        <CreateGroup supervisors={supervisors} school={school} groupCount={data.length} />
      )
    );
  };

  return (
    <>
      <DataTable
        urlState
        columns={columns({
          openDialog: (kind, { id: groupId }) => setDialog({ kind, groupId }),
          role,
        })}
        data={data}
        className="data-table data-table-action lg:mt-4"
        columnVisibilityState={{ "Group Type": false }}
        emptyStateMessage="No groups associated with this school"
        renderTableActions={renderTableActions()}
      />
      {group && (
        <>
          <StudentsInGroup
            students={group.students}
            groupId={group.id}
            groupName={group.groupName}
            schoolId={school.id}
            open={dialog?.kind === "students"}
            onOpenChange={onDialogOpenChange}
            role={role}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>Group {group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </StudentsInGroup>
          <StudentGroupEvaluation
            open={dialog?.kind === "evaluation"}
            onOpenChange={onDialogOpenChange}
            mode={role === "FELLOW" ? "add" : "view"}
            groupId={group.id}
            evaluations={group.reports}
            sessions={school.interventionSessions}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>Group {group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </StudentGroupEvaluation>
          {role !== "FELLOW" && supervisors && (
            <ReplaceFellow
              open={dialog?.kind === "replaceLeader"}
              onOpenChange={onDialogOpenChange}
              fellowId={group.leaderId}
              groupId={group.id}
              supervisors={supervisors}
            >
              <DialogAlertWidget>
                <div className="flex items-center gap-2">
                  <span>{group.fellowName}</span>
                  <span className="bg-shamiri-new-blue h-1 w-1 rounded-full">{""}</span>
                  <span>{group.groupName}</span>
                </div>
              </DialogAlertWidget>
            </ReplaceFellow>
          )}
          <ArchiveGroup
            groupId={group.id}
            open={dialog?.kind === "archive"}
            onOpenChange={onDialogOpenChange}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </ArchiveGroup>
          <UnarchiveGroup
            groupId={group.id}
            open={dialog?.kind === "unarchive"}
            onOpenChange={onDialogOpenChange}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </UnarchiveGroup>
        </>
      )}
    </>
  );
}
