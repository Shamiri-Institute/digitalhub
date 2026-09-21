"use client";

import type { interventionGroupReport, interventionSession, student } from "#/db/schema";
import type { ImplementerRole } from "#/db/enums";
import type { ColumnDef } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { GroupsDatatableMenu } from "#/components/common/group/groups-datatable-menu";
import { Badge } from "#/components/ui/badge";

export type SchoolGroupDataTableData = {
  id: string;
  groupName: string;
  groupType: string;
  leaderId: string;
  fellowName: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  schoolId: string;
  projectId: string;
  archivedAt: Date | null;
  groupRating: number | null;
  students: (typeof student.$inferSelect & { clinicalCasesCount: number })[];
  reports: (typeof interventionGroupReport.$inferSelect & {
    session: typeof interventionSession.$inferSelect | null;
  })[];
};

export const columns = (state: {
  setGroup: Dispatch<SetStateAction<SchoolGroupDataTableData | undefined>>;
  setStudentsDialog: Dispatch<SetStateAction<boolean>>;
  setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
  setLeaderDialog: Dispatch<SetStateAction<boolean>>;
  setArchiveDialog: Dispatch<SetStateAction<boolean>>;
  setUnarchiveDialog: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
}): ColumnDef<SchoolGroupDataTableData>[] => {
  return [
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
            variant={type === "TREATMENT" ? "default" : "outline-solid"}
            className="capitalize"
          >
            {type.toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: "button",
      cell: ({ row }) => <GroupsDatatableMenu group={row.original} state={state} />,
      enableHiding: false,
    },
  ];
};
