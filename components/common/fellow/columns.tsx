"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { FellowsDatatableMenu } from "#/components/common/fellow/fellows-datatable";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import type { ImplementerRole, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";
import type { Dispatch, SetStateAction } from "react";

export type SchoolFellowTableData = {
  id: string;
  fellowName: string;
  cellNumber: string;
  supervisorId: string | null;
  supervisorName: string | null;
  droppedOut: boolean | null;
  groupId: string | null;
  groupName: string | null;
  averageRating: number | null;
  fellowEmail: string | null;
  idNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  county: string | null;
  subCounty: string | null;
  mpesaName: string | null;
  mpesaNumber: string | null;
  students: Prisma.StudentGetPayload<{
    include: {
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>[];
};

export const columns = ({
  state,
  role,
}: {
  state: {
    setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
    setDetailsDialog: Dispatch<SetStateAction<boolean>>;
    setReplaceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
    setAssignSupervisorDialog: Dispatch<SetStateAction<boolean>>;
  };
  role: ImplementerRole;
}): ColumnDef<SchoolFellowTableData>[] => {
  return [
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
      accessorKey: "fellowName",
      id: "Name",
      header: "Name",
    },
    {
      header: "Average Rating",
      cell: ({ row }) => {
        const rating = row.original.averageRating ?? 0;
        return <DataTableRatingStars rating={rating} />;
      },
      id: "Average Rating",
    },
    {
      cell: ({ row }) =>
        row.original.droppedOut ? (
          <Badge variant="destructive">Inactive</Badge>
        ) : (
          <Badge variant="shamiri-green">Active</Badge>
        ),
      header: "Active Status",
      id: "Active Status",
    },
    {
      accessorKey: "groupName",
      header: "Group Name",
      id: "Group Name",
    },
    {
      header: "Phone Number",
      accessorFn: (row) => {
        return row.cellNumber && parsePhoneNumber(row.cellNumber, "KE").formatNational();
      },
    },
    {
      id: "button",
      cell: ({ row }) => <FellowsDatatableMenu fellow={row.original} state={state} role={role} />,
      enableHiding: false,
    },
  ];
};
