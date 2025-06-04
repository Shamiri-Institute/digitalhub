"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { GroupsDatatableMenu } from "#/components/common/group/groups-datatable-menu";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { ImplementerRole, Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Dispatch, SetStateAction } from "react";

export type SchoolGroupDataTableData = {
  id: string;
  groupName: string;
  groupType: string;
  leaderId: string;
  fellowName: string;
  supervisorId: string;
  supervisorName: string;
  schoolId: string;
  archivedAt: string;
  groupRating: number | null;
  students: Prisma.StudentGetPayload<{
    include: {
      _count: {
        select: {
          clinicalCases: true;
        };
      };
    };
  }>[];
  reports: Prisma.InterventionGroupReportGetPayload<{
    include: {
      session: true;
    };
  }>[];
};

export const columns = (state: {
  setGroup: Dispatch<SetStateAction<SchoolGroupDataTableData | undefined>>;
  setStudentsDialog: Dispatch<SetStateAction<boolean>>;
  setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
  setLeaderDialog: Dispatch<SetStateAction<boolean>>;
  setArchiveDialog: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
}): ColumnDef<SchoolGroupDataTableData>[] => {
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
      accessorKey: "groupName",
      id: "Group",
      header: "Group",
    },
    {
      header: "Group Rating",
      cell: ({ row }) => {
        return <DataTableRatingStars rating={row.original.groupRating ?? 0} />;
      },
      id: "Group Rating",
    },
    {
      accessorKey: "supervisorName",
      header: "Supervisor",
      id: "Supervisor",
    },
    {
      accessorKey: "fellowName",
      header: "Fellow",
      id: "Fellow",
    },
    {
      cell: ({ row }) =>
        row.original.archivedAt ? (
          <Badge variant="destructive">Inactive</Badge>
        ) : (
          <Badge variant="shamiri-green">Active</Badge>
        ),
      header: "Active Status",
      id: "Active Status",
    },
    {
      cell: ({ row }) => `${row.original.students.length}/15`,
      header: "No. of students",
      id: "No. of students",
    },
    {
      id: "Group Type",
      header: "Group Type",
      cell: ({ row }) => {
        const type = row.original.groupType;
        return (
          <Badge
            variant={type === "TREATMENT" ? "default" : "outline"}
            className="capitalize"
          >
            {type.toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: "button",
      cell: ({ row }) => (
        <GroupsDatatableMenu group={row.original} state={state} />
      ),
      enableHiding: false,
    },
  ];
};
