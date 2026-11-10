"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import ClinicalLeadCaseActionsDropdownMenu from "#/components/common/clinical/clinical-case-actions-dropdown-cl-ct";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { sortBy } from "#/lib/table-view";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<HubClinicalCases>[] = [
  {
    id: "expand",
    cell: ({ row }) => {
      return (
        <button
          type="button"
          aria-label={row.getIsExpanded() ? "Hide details" : "Show details"}
          aria-expanded={row.getIsExpanded()}
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
          {row.getIsExpanded() ? (
            <Image unoptimized priority src={ArrowUpIcon} alt="" width={16} height={16} />
          ) : (
            <Image unoptimized priority src={ArrowDownIcon} alt="" width={16} height={16} />
          )}
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "hub",
    header: "Hub",
  },
  {
    accessorKey: "school",
    header: "School",
  },
  {
    accessorKey: "pseudonym",
    header: "Pseudonym",
    cell: ({ row }) => {
      const flagged = row.original.flagged;
      return (
        <div className="flex items-center gap-1">
          <span>{row.original.pseudonym}</span>
          {flagged ? <Icons.flagTriangleRight className="h-4 w-4 text-destructive" /> : null}
          {row.original.studentHasMultipleOpenCases ? (
            <Badge variant="warning">Multiple open cases</Badge>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "supervisor",
    header: "Supervisor",
  },
  {
    accessorKey: "riskStatus",
    header: "Risk Status",
    cell: ({ row }) => {
      const riskLevel = row.original.riskStatus || "N/A";
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={colors[riskLevel || "success"]} className="uppercase">
            {riskLevel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {row.original.riskSource} · {format(row.original.riskDate, "dd MMM yyyy")}
          </span>
        </div>
      );
    },
  },

  {
    accessorKey: "caseReport",
    header: "Case Report",
    sortingFn: sortBy((clinicalCase) => clinicalCase.hasNotes),
    cell: ({ row }) => {
      return (
        <div>
          {row.original.hasNotes ? (
            <Badge variant="success">Uploaded</Badge>
          ) : (
            <Badge variant="destructive">Unavailable</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "treatmentPlan",
    header: "Treatment Plan",
    cell: ({ row }) => {
      return (
        <div>
          {row.original.treatmentPlan ? (
            <Badge variant="success">Uploaded</Badge>
          ) : (
            <Badge variant="destructive">Unavailable</Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "button",
    cell: ({ row }) => {
      return <ClinicalLeadCaseActionsDropdownMenu clinicalCase={row.original} />;
    },
    enableHiding: false,
  },
];

type BadgeVariant = "destructive" | "warning" | "success" | "default" | "secondary" | "outline";

const colors: Record<string, BadgeVariant> = {
  Active: "success",
  FollowUp: "warning",
  Referred: "destructive",
  Terminated: "destructive",
  Low: "success",
  Mid: "warning",
  High: "destructive",
  Severe: "destructive",
  No: "success",
  Medium: "warning",
};
