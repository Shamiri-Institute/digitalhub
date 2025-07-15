"use client";

import type { ImplementerRole, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import React, { type Dispatch, type SetStateAction } from "react";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";

export default function StudentsInGroup({
  children,
  open,
  onOpenChange,
  students,
  schoolId,
  groupId,
  groupName,
  role,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  students: Prisma.StudentGetPayload<{
    include: {
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>[];
  schoolId: string;
  groupId: string;
  groupName: string | null;
  role: ImplementerRole;
}) {
  const [addStudentDialog, setAddStudentDialog] = React.useState(false);
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="lg:w-2/3 lg:max-w-none">
          <DialogHeader>
            <h2 className="text-xl font-bold">Students in group</h2>
          </DialogHeader>
          {children}
          <DataTable
            columns={columns}
            data={students.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())}
            emptyStateMessage={"No students associated to this group"}
            columnVisibilityState={{
              "Shamiri ID": false,
            }}
            className="data-table lg:mt-4"
          />
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              className="text-shamiri-new-blue hover:text-shamiri-new-blue"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                setAddStudentDialog(true);
              }}
              className="flex items-center gap-2"
            >
              <Icons.plusCircle className="h-4 w-4" />
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StudentDetailsForm
        open={addStudentDialog}
        onOpenChange={setAddStudentDialog}
        mode="add"
        schoolId={schoolId}
        assignedGroupId={groupId}
        groupName={groupName ?? undefined}
        role={role}
      >
        {children}
      </StudentDetailsForm>
    </>
  );
}

const columns: ColumnDef<
  Prisma.StudentGetPayload<{
    include: {
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>
>[] = [
  {
    id: "Student name",
    header: "Student name",
    cell: ({ row }) => {
      return <span className="capitalize">{row.original.studentName?.toLowerCase()}</span>;
    },
  },
  {
    header: "Shamiri ID",
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  {
    header: "Admission number",
    id: "Admission number",
    accessorKey: "admissionNumber",
  },
  {
    header: "Age",
    id: "Age",
    accessorFn: (row) => row.yearOfBirth && `${new Date().getFullYear() - row.yearOfBirth} yrs`,
  },
  {
    header: "Clinical cases",
    id: "Clinical cases",
    accessorFn: (row) => {
      return row._count.clinicalCases;
    },
  },
];
