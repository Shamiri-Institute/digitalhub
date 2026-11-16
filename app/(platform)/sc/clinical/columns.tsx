"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import type { ReferralOptions } from "#/app/(platform)/sc/clinical/components/refer-clinical-case";
import { rowActionsButton } from "#/components/common/row-actions-menu";
import { deferred } from "#/components/deferred";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { sortBy } from "#/lib/table-view";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

// The row menu holds eight dialogs with their forms, so it loads after the page; its button is
// drawn until then.
const ClinicalCaseActionsDropdownMenu = deferred(() =>
  import("#/components/common/clinical/clinical-case-actions-dropdown").then((mod) => mod.default),
);

export function clinicalCaseColumns(referralOptions?: ReferralOptions): ColumnDef<ClinicalCases>[] {
  return [
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
          </div>
        );
      },
    },
    {
      accessorKey: "dateAdded",
      header: "Date added",
      cell: ({ row }) => {
        const date = row.original.dateAdded;
        if (!date) return "N/A";
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return "N/A";
        return format(parsed, "dd MMM yyyy");
      },
      sortingFn: sortBy((clinicalCase) => new Date(clinicalCase.dateAdded)),
    },
    {
      accessorKey: "caseStatus",
      header: "Case Status",
      cell: ({ row }) => {
        const caseStatus = row.original.caseStatus;
        return (
          <Badge variant={colors[caseStatus || "success"]} className="uppercase">
            {caseStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "risk",
      header: "Risk",
      cell: ({ row }) => {
        const riskLevel = row.original.risk || "N/A";
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
      accessorKey: "age",
      header: "Age",
      meta: { numeric: true },
    },
    {
      accessorKey: "referralFrom",
      header: "Referral From",
    },
    {
      id: "button",
      cell: ({ row }) => (
        <ClinicalCaseActionsDropdownMenu
          trigger={rowActionsButton(`Actions for ${row.original.pseudonym}`, "bg-white")}
          clinicalCase={row.original}
          role={row.original.role as "CLINICAL_LEAD" | "SUPERVISOR"}
          referralOptions={referralOptions}
        />
      ),
      enableHiding: false,
    },
  ];
}

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
