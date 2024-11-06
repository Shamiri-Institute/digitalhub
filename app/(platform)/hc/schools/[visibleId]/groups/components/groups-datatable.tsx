"use client";

import {
  columns,
  SchoolGroupDataTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import ArchiveGroup from "#/components/common/group/archive-group";
import CreateGroup from "#/components/common/group/create-group";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { Prisma } from "@prisma/client";
import { useEffect, useState } from "react";

export default function GroupsDataTable({
  data,
  school,
  supervisors,
}: {
  data: SchoolGroupDataTableData[];
  school: Prisma.SchoolGetPayload<{}>;
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
}) {
  const [group, setGroup] = useState<SchoolGroupDataTableData>();
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);
  const [leaderDialog, setLeaderDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);

  useEffect(() => {
    if (group) {
      const updatedGroup = data.find((_group) => {
        return _group.id === group.id;
      });
      setGroup(updatedGroup);
    }
  }, [data, group]);

  const renderTableActions = () => {
    return (
      <CreateGroup
        supervisors={supervisors}
        school={school}
        groupCount={data.length}
      ></CreateGroup>
    );
  };

  return (
    <>
      <DataTable
        columns={columns({
          setGroup,
          setStudentsDialog,
          setEvaluationDialog,
          setLeaderDialog,
          setArchiveDialog,
        })}
        data={data}
        className="data-table data-table-action mt-4"
        columnVisibilityState={{ "Active Status": false }}
        emptyStateMessage="No groups associated with this school"
        renderTableActions={renderTableActions()}
      />
      {group && (
        <>
          <StudentsInGroup
            students={group.students}
            groupId={group.id}
            groupName={group.groupName}
            schoolVisibleId={school.visibleId}
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
          <ReplaceFellow
            open={leaderDialog}
            onOpenChange={setLeaderDialog}
            fellowId={group.leaderId}
            groupId={group.id}
            supervisors={supervisors}
            schoolVisibleId={school.visibleId}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{group.fellowName}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                  {""}
                </span>
                <span>{group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </ReplaceFellow>
          <ArchiveGroup
            groupId={group.id}
            open={archiveDialog}
            onOpenChange={setArchiveDialog}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </ArchiveGroup>
        </>
      )}
    </>
  );
}
