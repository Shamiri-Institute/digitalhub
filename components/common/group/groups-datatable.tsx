"use client";

import { ImplementerRole, type Prisma } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import ArchiveGroup from "#/components/common/group/archive-group";
import { columns, type SchoolGroupDataTableData } from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import StudentGroupEvaluation from "#/components/common/group/student-group-evaluation";
import UnarchiveGroup from "#/components/common/group/unarchive-group";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import type { PaginationMeta } from "#/lib/types/pagination";

export default function GroupsDataTable({
  data,
  school,
  supervisors,
  role,
  pagination,
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
  pagination?: PaginationMeta;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState<SchoolGroupDataTableData>();
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);
  const [leaderDialog, setLeaderDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [unarchiveDialog, setUnarchiveDialog] = useState(false);

  useEffect(() => {
    if (group) {
      const updatedGroup = data.find((_group) => {
        return _group.id === group.id;
      });
      setGroup(updatedGroup);
    }
  }, [data, group]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", size.toString());
    params.set("page", "1");
    router.push(`?${params.toString()}`);
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
        columns={columns({
          setGroup,
          setStudentsDialog,
          setEvaluationDialog,
          setLeaderDialog,
          setArchiveDialog,
          setUnarchiveDialog,
          role,
        })}
        data={data}
        className="data-table data-table-action lg:mt-4"
        columnVisibilityState={{ "Group Type": false }}
        emptyStateMessage="No groups associated with this school"
        renderTableActions={renderTableActions()}
        serverPagination={
          pagination
            ? {
                ...pagination,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
              }
            : undefined
        }
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
            role={role}
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
              open={leaderDialog}
              onOpenChange={setLeaderDialog}
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
          <ArchiveGroup groupId={group.id} open={archiveDialog} onOpenChange={setArchiveDialog}>
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{group.groupName}</span>
              </div>
            </DialogAlertWidget>
          </ArchiveGroup>
          <UnarchiveGroup
            groupId={group.id}
            open={unarchiveDialog}
            onOpenChange={setUnarchiveDialog}
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
