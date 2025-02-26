"use client";

import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import ClinicalCaseActionsDropdownMenu from "#/app/(platform)/sc/clinical/components/clinical-case-actions-dropdown";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";

export const columns: ColumnDef<ClinicalCases>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button
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
          {flagged && (
            <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "dateAdded",
    header: "Date added",
    cell: ({ row }) => {
      const date = new Date(row.original.dateAdded || "");
      return format(date, "dd MMM yyyy");
    },
  },
  {
    accessorKey: "caseStatus",
    header: "Case Status",
    cell: ({ row }) => renderRiskOrCaseStatus(row.original.caseStatus),
  },
  {
    accessorKey: "risk",
    header: "Risk",
    cell: ({ row }) => renderRiskOrCaseStatus(row.original.risk),
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
      <ClinicalCaseActionsDropdownMenu clinicalCase={row.original} />
    ),
    enableHiding: false,
  },
];

type SubComponentData = {
  emergencyPresentingIssues?: string;
  generalPresentingIssues?: string;
  sessionAttendanceHistory?: string;
  lowRisk: boolean;
  moderateRisk: boolean;
  highRisk: boolean;
  severeRisk: boolean;
};

type SessionAttendanceData = {
  session: string;
  sessionDate: string;
  attendanceStatus: boolean | null;
};

const riskLevelColumns: ColumnDef<SubComponentData>[] = [
  {
    accessorKey: "lowRisk",
    header: "Low Risk",
    enableHiding: false,
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <input
        type="checkbox"
        checked={getValue() as boolean}
        onChange={() => {}}
        className="h-4 w-4"
      />
    ),
  },
  {
    accessorKey: "moderateRisk",
    header: "Moderate Risk",
    enableHiding: false,
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <input
        type="checkbox"
        checked={getValue() as boolean}
        onChange={() => {}}
        className="h-4 w-4"
      />
    ),
  },
  {
    accessorKey: "highRisk",
    header: "High Risk",
    enableHiding: false,
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <input
        type="checkbox"
        checked={getValue() as boolean}
        onChange={() => {}}
        className="h-4 w-4"
      />
    ),
  },
  {
    accessorKey: "severeRisk",
    header: "Severe Risk",
    enableHiding: false,
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <input
        type="checkbox"
        checked={getValue() as boolean}
        onChange={() => {}}
        className="h-4 w-4"
      />
    ),
  },
].map((column) => ({
  ...column,
  enableSorting: false,
}));

export const subColumnsEmergency: ColumnDef<SubComponentData>[] = [
  {
    accessorKey: "emergencyPresentingIssues",
    header: "Emergency presenting issues",
    enableHiding: false,
    enableSorting: false,
  },
  ...riskLevelColumns,
];

export const subColumnsGeneral: ColumnDef<SubComponentData>[] = [
  {
    accessorKey: "generalPresentingIssues",
    header: "General presenting issues",
    enableHiding: false,
    enableSorting: false,
  },
  ...riskLevelColumns,
];

export const subColumnsSessionAttendanceHistory: ColumnDef<SessionAttendanceData>[] =
  [
    {
      accessorKey: "session",
      header: "Session",
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: "sessionDate",
      header: "Session date",
      enableHiding: false,
      enableSorting: false,
    },
    {
      header: "Session status",
      cell: ({ row }) => {
        const completed = row.original.attendanceStatus;
        const cancelled = row.original.attendanceStatus === false;
        return (
          <div className="flex">
            <div
              className={cn(
                "select-none rounded-[0.25rem] border px-1.5 py-0.5",
                {
                  "border-green-border": completed,
                  "border-blue-border": !completed,
                  "border-red-border": cancelled,
                },
                {
                  "bg-green-bg": completed,
                  "bg-blue-bg": !completed,
                  "bg-red-bg": cancelled,
                },
              )}
            >
              <div
                className={cn("text-[0.825rem] font-semibold", {
                  "text-green-base": completed,
                  "text-blue-base": !completed,
                  "text-red-base": cancelled,
                })}
              >
                <div className="flex items-center gap-1">
                  {completed && !cancelled && (
                    <div className="flex items-center gap-1">
                      <Icons.checkCircle
                        className="h-3.5 w-3.5"
                        strokeWidth={2.5}
                      />
                      <span>Attended</span>
                    </div>
                  )}
                  {!completed && !cancelled && (
                    <div className="flex items-center gap-1">
                      <Icons.helpCircle
                        className="h-3.5 w-3.5"
                        strokeWidth={2.5}
                      />
                      <span>Not marked</span>
                    </div>
                  )}
                  {cancelled && (
                    <div className="flex items-center gap-1">
                      <Icons.crossCircleFilled
                        className="h-3.5 w-3.5"
                        strokeWidth={2.5}
                      />
                      <span>Cancelled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "button",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild={true}>
            <div className="absolute inset-0 border-l bg-white">
              <div className="flex h-full w-full items-center justify-center">
                <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="text-xs font-medium uppercase text-shamiri-text-grey">
                Actions
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement mark session attendance
              }}
            >
              Mark session attendance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableHiding: false,
    },
  ];

type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  Active: "bg-shamiri-green",
  FollowUp: "bg-shamiri-light-orange",
  Referred: "bg-shamiri-light-red",
  Terminated: "bg-shamiri-red",
  Low: "bg-shamiri-green",
  Mid: "bg-shamiri-light-orange",
  High: "bg-shamiri-light-red",
  Severe: "bg-shamiri-red",
  No: "bg-shamiri-green",
  Medium: "bg-shamiri-light-orange",
};

function renderRiskOrCaseStatus(value: string) {
  return <Badge className={cn(colors[value], "text-white")}>{value}</Badge>;
}
