"use client";

import {
  columns,
  SchoolGroupDataTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { useEffect, useState } from "react";

export default function GroupsDataTable({
  data,
  schoolVisibleId,
}: {
  data: SchoolGroupDataTableData[];
  schoolVisibleId: string;
}) {
  const [group, setGroup] = useState<SchoolGroupDataTableData>();
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);

  useEffect(() => {
    if (group) {
      const updatedGroup = data.find((_group) => {
        return _group.id === group.id;
      });
      setGroup(updatedGroup);
    }
  }, [data, group]);

  return (
    <>
      <DataTable
        columns={columns({ setGroup, setStudentsDialog, setEvaluationDialog })}
        data={data}
        className="data-table data-table-action mt-4"
        columnVisibilityState={{ "Active Status": false }}
        emptyStateMessage="No groups associated with this school"
      />
      {group && (
        <>
          <StudentsInGroup
            students={group.students}
            groupId={group.id}
            groupName={group.groupName}
            schoolVisibleId={schoolVisibleId}
            open={studentsDialog}
            onOpenChange={setStudentsDialog}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>Group {group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </StudentsInGroup>
          <StudentGroupEvaluation
            open={evaluationDialog}
            onOpenChange={setEvaluationDialog}
            mode="view"
            groupId={group.id}
            evaluations={group.reports}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>Group {group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </StudentGroupEvaluation>
        </>
      )}
    </>
  );
}
