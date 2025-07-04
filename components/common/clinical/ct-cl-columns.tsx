"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import type { CaseNotesResult, HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import ClinicalLeadCaseActionsDropdownMenu from "#/components/common/clinical/clinical-case-actions-dropdown-cl-ct";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ClinicalCaseNotes } from "@prisma/client";

type CaseNotesForRiskStatus = Array<{
  createdAt: string;
  riskLevel: string;
}>;

export const columns: ColumnDef<HubClinicalCases>[] = [
  {
    id: "button",
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
          {flagged ? <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" /> : null}
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
    cell: ({ row }) =>
      renderRiskOrCaseStatus(
        row.original.riskStatus,
        row.original.caseNotes.map((note) => ({
          createdAt: note.createdAt.toISOString(),
          riskLevel: note.riskLevel,
        })),
      ),
  },

  {
    accessorKey: "caseReport",
    header: "Case Report",
    cell: ({ row }) => {
      return (
        <div>
          {row.original.hasNotes ? (
            <Badge variant="shamiri-green">Uploaded</Badge>
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
            <Badge variant="shamiri-green">Uploaded</Badge>
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

export function renderRiskOrCaseStatus(value: string, caseNotes: CaseNotesForRiskStatus) {
  if (caseNotes.length === 0) {
    return <Badge variant="shamiri-green">N/A</Badge>;
  }
  const latestRiskLevel = caseNotes?.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]?.riskLevel;
  return (
    <Badge variant={colors[latestRiskLevel || "shamiri-green"]} className="uppercase">
      {latestRiskLevel}
    </Badge>
  );
}
