"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import type {
  FellowForSupervisor,
  TriageEventForSupervisor,
} from "#/app/(platform)/sc/triage/action";
import CreateClinicalCaseModal from "#/app/(platform)/sc/triage/components/create-clinical-case-modal";
import DataTable from "#/components/data-table";
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

type FellowRow = {
  fellowId: string;
  fellowName: string;
  totalEvents: number;
  breakdown: string;
  referredToOthers: number;
  completionRate: number | null;
  events: TriageEventForSupervisor[];
};

const ACTION_LABELS: Record<string, string> = {
  SUPPORTED: "Supported",
  REFERRED: "Referred",
  ESCALATED: "Escalated",
  REFUSED: "Refused",
  INTERRUPTED: "Interrupted",
};

function RiskBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "ANY_YES")
    return <Badge className="bg-red-bg text-red-base border-red-border">Risk +</Badge>;
  if (outcome === "ALL_NO")
    return <Badge className="bg-green-bg text-green-base border-green-border">Risk −</Badge>;
  return (
    <Badge variant="outline" className="text-shamiri-text-grey">
      Incomplete
    </Badge>
  );
}

function FellowEventSubTable({
  events,
  supervisorId,
  onCreateCase,
}: {
  events: TriageEventForSupervisor[];
  supervisorId: string;
  onCreateCase: (id: string) => void;
}) {
  const columns = useMemo<ColumnDef<TriageEventForSupervisor>[]>(
    () => [
      {
        id: "Student",
        header: "Student",
        accessorFn: (e) => e.student.studentName ?? e.student.visibleId ?? "",
        cell: ({ row }) => (
          <span className="font-medium capitalize">
            {row.original.student.studentName?.toLowerCase() ??
              row.original.student.visibleId ??
              "—"}
          </span>
        ),
      },
      {
        id: "School",
        header: "School",
        accessorFn: (e) => e.student.school?.schoolName ?? "—",
      },
      {
        id: "Session",
        header: "Session",
        cell: ({ row }) => {
          const e = row.original;
          const label =
            e.session.session?.sessionLabel ??
            e.session.sessionName ??
            e.session.sessionType ??
            "—";
          const date = e.session.sessionDate
            ? new Date(e.session.sessionDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : null;
          return (
            <span>
              {label}
              {date && <span className="text-shamiri-text-grey ml-1">· {date}</span>}
            </span>
          );
        },
      },
      {
        id: "Risk",
        header: "Risk",
        cell: ({ row }) => <RiskBadge outcome={row.original.riskScreenOutcome} />,
      },
      {
        id: "Action",
        header: "Action",
        accessorFn: (e) => ACTION_LABELS[e.actionTaken ?? ""] ?? "—",
      },
      {
        id: "Referred to",
        header: "Referred to",
        cell: ({ row }) => {
          const e = row.original;
          if (!e.referredSupervisor?.supervisorName)
            return <span className="text-shamiri-text-grey">—</span>;
          const isYou = e.referredSupervisorId === supervisorId;
          return (
            <span className={cn(!isYou && "text-shamiri-text-grey")}>
              {isYou ? "You" : e.referredSupervisor.supervisorName}
            </span>
          );
        },
      },
      {
        id: "Case",
        header: "Case",
        cell: ({ row }) =>
          row.original.clinicalCaseExists ? (
            <Badge className="bg-green-bg text-green-base border-green-border">Open</Badge>
          ) : (
            <Badge variant="outline" className="text-shamiri-text-grey">
              None
            </Badge>
          ),
      },
      {
        id: "button",
        cell: ({ row }) => {
          const e = row.original;
          if (e.referredSupervisorId === supervisorId && !e.clinicalCaseExists) {
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="absolute inset-0 border-l bg-white">
                    <div className="flex h-full w-full items-center justify-center">
                      <Icons.moreHorizontal className="text-shamiri-text-grey h-5 w-5" />
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <span className="text-shamiri-text-grey text-xs font-medium uppercase">
                      Actions
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-shamiri-black"
                    onClick={() => onCreateCase(e.id)}
                  >
                    Create clinical case
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          return null;
        },
        enableHiding: false,
      },
    ],
    [supervisorId, onCreateCase],
  );

  return (
    <DataTable
      data={events}
      columns={columns}
      disableSearch={true}
      disablePagination={true}
      editColumns={false}
      isSubComponent={true}
      emptyStateMessage="No triage events from this fellow yet."
      className="data-table data-table-action mt-0 border-0 bg-white"
    />
  );
}

export default function FellowActivityTable({
  events,
  fellows,
  supervisorId,
}: {
  events: TriageEventForSupervisor[];
  fellows: FellowForSupervisor[];
  supervisorId: string;
}) {
  const [caseTarget, setCaseTarget] = useState<string | null>(null);

  const eventsByFellow = useMemo(
    () =>
      events.reduce<Record<string, TriageEventForSupervisor[]>>((acc, e) => {
        const list = acc[e.fellowId] ?? [];
        list.push(e);
        acc[e.fellowId] = list;
        return acc;
      }, {}),
    [events],
  );

  const rows = useMemo<FellowRow[]>(
    () =>
      fellows.map((f) => {
        const fellowEvents = eventsByFellow[f.id] ?? [];
        const counts = fellowEvents.reduce(
          (acc, e) => {
            const action = e.actionTaken ?? "UNKNOWN";
            acc[action] = (acc[action] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        const completed = fellowEvents.filter(
          (e) => e.riskScreenOutcome !== "NOT_COMPLETED",
        ).length;
        return {
          fellowId: f.id,
          fellowName: f.fellowName ?? f.id,
          totalEvents: fellowEvents.length,
          breakdown: Object.entries(counts)
            .map(([action, count]) => `${count} ${ACTION_LABELS[action] ?? action}`)
            .join(", "),
          referredToOthers: fellowEvents.filter(
            (e) => e.referredSupervisorId && e.referredSupervisorId !== supervisorId,
          ).length,
          completionRate:
            fellowEvents.length > 0 ? Math.round((completed / fellowEvents.length) * 100) : null,
          events: fellowEvents,
        };
      }),
    [fellows, eventsByFellow, supervisorId],
  );

  const fellowColumns = useMemo<ColumnDef<FellowRow>[]>(
    () => [
      {
        id: "checkbox",
        cell: ({ row }) =>
          row.original.totalEvents > 0 ? (
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
                  alt="Collapse"
                  width={16}
                  height={16}
                />
              ) : (
                <Image
                  unoptimized
                  priority
                  src={ArrowDownIcon}
                  alt="Expand"
                  width={16}
                  height={16}
                />
              )}
            </button>
          ) : (
            <div className="w-10" />
          ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "Fellow",
        accessorKey: "fellowName",
        header: "Fellow",
      },
      {
        id: "Total events",
        accessorKey: "totalEvents",
        header: "Total events",
      },
      {
        id: "Breakdown",
        header: "Breakdown",
        cell: ({ row }) => (
          <span className="text-shamiri-text-grey text-xs">{row.original.breakdown || "—"}</span>
        ),
      },
      {
        id: "Referred to others",
        header: "Referred to others",
        cell: ({ row }) => (
          <span
            className={cn(
              row.original.referredToOthers > 0 && "text-shamiri-light-red font-medium",
            )}
          >
            {row.original.referredToOthers}
          </span>
        ),
      },
      {
        id: "Screen completion",
        header: "Screen completion",
        cell: ({ row }) => {
          const rate = row.original.completionRate;
          return rate !== null ? (
            <span className={cn(rate < 80 && "text-shamiri-light-red font-medium")}>{rate}%</span>
          ) : (
            <span className="text-shamiri-text-grey">—</span>
          );
        },
      },
    ],
    [],
  );

  const handleCreateCase = useCallback((id: string) => setCaseTarget(id), []);

  return (
    <>
      <DataTable
        data={rows}
        columns={fellowColumns}
        className="data-table data-table-action bg-white"
        emptyStateMessage="No fellows assigned to you yet."
        columnVisibilityState={{
          Breakdown: false,
          "Referred to others": false,
        }}
        getRowCanExpand={(row) => row.original.totalEvents > 0}
        renderSubComponent={({ row }) => (
          <FellowEventSubTable
            events={row.original.events}
            supervisorId={supervisorId}
            onCreateCase={handleCreateCase}
          />
        )}
      />
      {caseTarget && (
        <CreateClinicalCaseModal
          triageEventId={caseTarget}
          isOpen={true}
          onClose={() => setCaseTarget(null)}
        />
      )}
    </>
  );
}
