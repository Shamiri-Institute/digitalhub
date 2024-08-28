"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
      <DialogContent className="w-1/2 max-w-none">
        <DialogHeader>
          <h2 className="text-lg font-bold">Students in group</h2>
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
        <DialogFooter>
          <Button
            variant="brand"
            onClick={() => {
              context.setGroupDialog(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<Prisma.StudentGetPayload<{}>>[] = [
  {
    accessorKey: "studentName",
    id: "Student name",
    header: "Student name",
  },
  {
    header: "Group no.",
    id: "Group no.",
    accessorKey: "assignedGroupId",
  },
  {
    header: "Shamiri ID.",
    id: "Shamiri ID.",
    accessorKey: "visibleId",
  },
  // TODO: Add birthDate column to students table
  {
    header: "Age",
    id: "Age",
    accessorFn: (row) => {
      return null;
    },
  },
  // TODO: Get clinical cases and display number
  {
    header: "Clinical cases",
    id: "Clinical cases",
    accessorFn: (row) => {
      return null;
    },
  },
];
