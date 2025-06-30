"use client";

import type { SupervisorClinicalCasesData } from "#/app/(platform)/ct/supervisors/actions";
import { Badge } from "#/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<SupervisorClinicalCasesData>[] = [
  {
    accessorKey: "supervisorName",
    header: "Supervisor Name",
  },
  {
    accessorKey: "activeStatus",
    header: "Active Status",
    cell: ({ row }) => {
      return (
        <Badge variant={colors[row.original.activeStatus] || "shamiri-green"}>
          {row.original.activeStatus}
        </Badge>
      );
    },
  },
  {
    accessorKey: "noOfClinicalCases",
    header: "No. of Clinical Cases",
  },
  {
    accessorKey: "noOfTreatmentPlans",
    header: "No. of Treatment Plans",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2 text-shamiri-black">
          {String(row.original.noOfClinicalCases || 0)}/
          {String(row.original.sessionsHad || 0)}
        </div>
      );
    },
  },
  {
    accessorKey: "noOfCaseNotes",
    header: "No. of Case Notes",
  },
  // {
  //   id: "button",
  //   cell: ({ row }) => (
  //     <SupervisorClinicalCasesDropdownActions clinicalCase={row.original} />
  //   ),
  //   enableHiding: false,
  // },
];

type BadgeVariant =
  | "destructive"
  | "warning"
  | "shamiri-green"
  | "default"
  | "secondary"
  | "outline";

const colors: Record<string, BadgeVariant> = {
  Active: "shamiri-green",
  FollowUp: "warning",
  Referred: "destructive",
  Terminated: "destructive",
  Low: "shamiri-green",
  Mid: "warning",
  High: "destructive",
  Severe: "destructive",
  No: "shamiri-green",
  Medium: "warning",
};
