"use client";

import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { SchoolStudentTableData } from "#/components/common/student/columns";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { sessionDisplayName } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format, isBefore } from "date-fns";
import { Dispatch, SetStateAction } from "react";

export default function GroupTransferHistory({
  open,
  onOpenChange,
  student,
}: {
  student: SchoolStudentTableData;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  let transferHistoryData = student.studentGroupTransferTrail
    ? [
        // creates current group row data
        {
          id: "",
          studentId: student.id,
          createdAt: student.createdAt,
          updatedAt: student.createdAt,
          currentGroupId: "",
          fromGroupId: student.assignedGroupId,
          fromGroup: student.assignedGroup,
        } as Prisma.StudentGroupTransferTrailGetPayload<{
          include: {
            fromGroup: {
              include: {
                leader: true;
              };
            };
          };
        }>,
        ...student.studentGroupTransferTrail,
      ]
    : [];

  function mapTransferHistoryData(
    transferHistoryData: typeof student.studentGroupTransferTrail,
    studentCreatedAt: Date,
  ) {
    return transferHistoryData.map((item, index, array) => {
      const nextItem = array[index + 1];
      return {
        ...item,
        createdAt: nextItem ? nextItem.createdAt : studentCreatedAt,
      };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-3/5 max-w-none">
        <DialogHeader>
          <h2 className="text-xl font-bold">View group transfer history</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{student.studentName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>{student.assignedGroup?.groupName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>{student.form}</span>
            <span>{student.stream}</span>
          </div>
        </DialogAlertWidget>
        <div>
          <DataTable
            columns={columns(student.school?.interventionSessions ?? [])}
            editColumns={false}
            data={mapTransferHistoryData(
              transferHistoryData,
              student.createdAt,
            )}
            emptyStateMessage={"No transfer records found"}
            className="data-table lg:mt-4"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="brand"
            onClick={() => {
              onOpenChange(false);
            }}
            className="flex items-center gap-2"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns = (
  sessions: Prisma.InterventionSessionGetPayload<{
    include: {
      session: true;
    };
  }>[],
): ColumnDef<
  Prisma.StudentGroupTransferTrailGetPayload<{
    include: {
      fromGroup: {
        include: {
          leader: true;
        };
      };
    };
  }>
>[] => [
  {
    id: "Date of transfer",
    header: "Date of transfer",
    accessorFn: (row) => {
      return format(row.createdAt, "dd MMM yyyy");
    },
  },
  {
    header: "Session",
    id: "session",
    cell: (props) => {
      const previousSessions = sessions
        .filter((session) => {
          return isBefore(session.sessionDate, props.row.original.createdAt);
        })
        .sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());
      const session = previousSessions[0];
      return <span>{sessionDisplayName(session?.session?.sessionName)}</span>;
    },
  },
  {
    header: "Group name",
    id: "Group name",
    accessorKey: "fromGroup.groupName",
  },
  {
    header: "Fellow",
    id: "Fellow",
    accessorKey: "fromGroup.leader.fellowName",
  },
];
