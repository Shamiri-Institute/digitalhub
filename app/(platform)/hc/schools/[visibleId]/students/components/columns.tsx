"use client";

import StudentsDataTableMenu from "#/app/(platform)/hc/schools/[visibleId]/students/components/students-datatable-menu";
import { Checkbox } from "#/components/ui/checkbox";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import format from "date-fns/format";
import { parsePhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction } from "react";

export type SchoolStudentTableData = Prisma.StudentGetPayload<{
  include: {
    clinicalCases: {
      include: {
        sessions: true;
      };
    };
    studentAttendances: {
      include: {
        session: true;
        group: true;
      };
    };
    assignedGroup: true;
    school: {
      include: {
        interventionSessions: true;
      };
    };
  };
}>;

export const columns = (state: {
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
  setStudent: Dispatch<SetStateAction<SchoolStudentTableData | null>>;
}): ColumnDef<SchoolStudentTableData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
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
    accessorKey: "studentName",
    header: "Student Name",
    id: "Student Name",
  },
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "assignedGroupId",
    header: "Group No.",
    id: "Group No.",
  },
  {
    header: "Shamiri ID",
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  {
    accessorFn: (row) =>
      row.yearOfBirth && new Date().getFullYear() - row.yearOfBirth + " yrs",
    header: "Age",
    id: "Age",
  },
  {
    header: "Clinical Sessions",
    id: "Clinical Sessions",
    accessorFn: (row) =>
      row.clinicalCases?.reduce((acc, val) => acc + val.sessions.length, 0),
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    header: "Contact no.",
    id: "Contact no.",
    accessorFn: (row) =>
      row.phoneNumber &&
      parsePhoneNumber(row.phoneNumber, "KE").formatNational(),
  },
  {
    header: "Admission number",
    id: "Admission number",
    accessorKey: "admissionNumber",
  },
  {
    header: "Stream",
    id: "Stream",
    accessorKey: "stream",
  },
  {
    header: "Class/Form",
    id: "Class/Form",
    accessorKey: "form",
  },
  {
    header: "Date added",
    id: "Date added",
    accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
  },
  {
    id: "button",
    cell: ({ row }) => (
      <StudentsDataTableMenu student={row.original} state={state} />
    ),
    enableHiding: false,
  },
];
