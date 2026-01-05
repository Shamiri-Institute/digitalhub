"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import ClinicalCaseActionsDropdownMenu from "#/components/common/clinical/clinical-case-actions-dropdown";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<ClinicalCases>[] = [
  {
    id: "checkbox",
    cell: ({ row }) => {
      return (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
          {row.getIsExpanded() ? (
            <Image
              unoptimized
              priority
              src={ArrowUpIcon}
              alt="Arrow Up Icon"
              width={16}
              height={16}
            />
          ) : (
            <Image
              unoptimized
              priority
              src={ArrowDownIcon}
              alt="Arrow Down Icon"
              width={16}
              height={16}
            />
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
          {flagged ? <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" /> : null}
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
  },
  {
    accessorKey: "caseStatus",
    header: "Case Status",
    cell: ({ row }) => {
      const caseStatus = row.original.caseStatus;
      return (
        <Badge variant={colors[caseStatus || "shamiri-green"]} className="uppercase">
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
        <Badge variant={colors[riskLevel || "shamiri-green"]} className="uppercase">
          {riskLevel}
        </Badge>
      );
    },
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "referralFrom",
    header: "Referral From",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <ClinicalCaseActionsDropdownMenu
        clinicalCase={row.original}
        role={row.original.role as "CLINICAL_LEAD" | "SUPERVISOR"}
      />
    ),
    enableHiding: false,
  },
];

type BadgeVariant =
  | "destructive"
  | "warning"
  | "shamiri-green"
  | "default"
  | "secondary"
  | "outline-solid";

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
