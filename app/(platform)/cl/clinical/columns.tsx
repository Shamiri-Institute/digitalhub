"use client";

import { HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import ClinicalCaseActionsDropdownMenu from "#/app/(platform)/cl/clinical/components/clinical-case-actions-dropdown";
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
import Image from "next/image";

export const columns: ColumnDef<HubClinicalCases>[] = [
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
          {flagged ? (
            <Icons.flagTriangleRight className="h-4 w-4 text-shamiri-red" />
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
    cell: ({ row }) => renderRiskOrCaseStatus(row.original.riskStatus),
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
    cell: ({ row }) => (
      <ClinicalCaseActionsDropdownMenu clinicalCase={row.original} />
    ),
    enableHiding: false,
  },
];

type SessionAttendanceData = {
  session: string;
  sessionDate: string;
  attendanceStatus: boolean | null;
};

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

function renderRiskOrCaseStatus(value: string) {
  return <Badge variant={colors[value] || "shamiri-green"}>{value}</Badge>;
}
