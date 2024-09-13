"use client";

import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { useContext } from "react";

export default function StudentsInGroup() {
  const context = useContext(FellowInfoContext);
  const schoolContext = useContext(SchoolInfoContext);
  return (
    <Dialog open={context.groupDialog} onOpenChange={context.setGroupDialog}>
      <DialogContent className="w-3/4 max-w-none">
        <DialogHeader>
          <h2 className="text-xl font-bold">Students in group</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{context.fellow?.fellowName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>{context.fellow?.groupName}</span>
          </div>
        </DialogAlertWidget>
        <div>
          <DataTable
            columns={columns}
            editColumns={false}
            data={
              schoolContext.school
                ? schoolContext.school.students.filter(
                    (student) =>
                      student.assignedGroupId === context.fellow?.groupId,
                  )
                : []
            }
            emptyStateMessage={"No students associated to this group"}
            className="data-table"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={() => {
              context.setGroupDialog(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              context.setAddStudentDialog(true);
            }}
            className="flex items-center gap-2"
          >
            <Icons.plusCircle className="h-4 w-4" />
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<
  Prisma.StudentGetPayload<{
    include: {
      assignedGroup: true;
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>
>[] = [
  {
    accessorKey: "studentName",
    id: "Student name",
    header: "Student name",
  },
  {
    header: "Group name",
    id: "Group name",
    accessorKey: "assignedGroup.groupName",
  },
  {
    header: "Shamiri ID",
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  // TODO: Add birthDate column to students table
  {
    header: "Age",
    id: "Age",
    accessorFn: (row) => {
      const now = new Date();
      return row.age
        ? row.age + " yrs"
        : row.yearOfBirth
          ? now.getFullYear() - row.yearOfBirth + " yrs"
          : null;
    },
  },
  // TODO: Get clinical cases and display number
  {
    header: "Clinical cases",
    id: "Clinical cases",
    accessorFn: (row) => {
      return row._count.clinicalCases;
    },
  },
];
