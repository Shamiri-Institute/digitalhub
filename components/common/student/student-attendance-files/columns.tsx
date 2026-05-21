"use client";

import type { ColumnDef } from "@tanstack/react-table";
import StudentAttendanceFilesMenu from "#/components/common/student/student-attendance-files/student-attendance-files-menu";
import { Checkbox } from "#/components/ui/checkbox";
import type { StudentAttendanceFileData } from "#/lib/actions/file/student-attendance";

export const studentAttendanceFileColumns = (): ColumnDef<StudentAttendanceFileData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: "Date Added",
    id: "Date Added",
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "fileName",
    header: "File Name",
    id: "File Name",
  },
  {
    id: "Session",
    header: "Session",
    accessorFn: (row) => row.session?.session?.sessionName ?? "-",
  },
  {
    id: "Group",
    header: "Group",
    accessorFn: (row) => row.group?.groupName ?? "-",
  },
  {
    id: "button",
    cell: ({ row }) => <StudentAttendanceFilesMenu file={row.original} />,
    enableHiding: false,
  },
];
