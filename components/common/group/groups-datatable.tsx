"use client";

import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import ArchiveGroup from "#/components/common/group/archive-group";
import {
  columns,
  SchoolGroupDataTableData,
} from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { ImplementerRole, Prisma } from "@prisma/client";
import { useEffect, useState } from "react";

export default function GroupsDataTable({
  data,
  school,
  supervisors,
  role,
}: {
  data: SchoolGroupDataTableData[];
  school: Prisma.SchoolGetPayload<{
    include: {
      interventionSessions: {
        include: {
          session: true;
        };
      };
    };
  }>;
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  role: ImplementerRole;
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
      role !== "FELLOW" &&
      supervisors && (
        <CreateGroup
          supervisors={supervisors}
          school={school}
          groupCount={data.length}
        ></CreateGroup>
      )
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
          role,
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
            schoolId={school.id}
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
              open={leaderDialog}
              onOpenChange={setLeaderDialog}
              fellowId={group.leaderId}
              groupId={group.id}
              supervisors={supervisors}
              schoolId={school.visibleId}
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
          )}
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
