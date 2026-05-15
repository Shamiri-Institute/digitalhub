"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import CreateClinicalCaseModal from "#/app/(platform)/sc/triage/components/create-clinical-case-modal";
import TriageReviewModal from "#/app/(platform)/sc/triage/components/triage-review-modal";
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

type RequiresActionEvent = TriageEventForSupervisor & {
  viewSection: "requires_action";
};

const HANDOFF_LABELS: Record<string, string> = {
  WARM_HANDOFF: "Warm handoff",
  SUPERVISOR_NOTIFIED: "Notified",
  COULD_NOT_REACH: "Could not reach",
  STUDENT_REFUSED_NOTIFIED: "Student refused",
};

export default function RequiresActionTable({ events }: { events: RequiresActionEvent[] }) {
  const [reviewTarget, setReviewTarget] = useState<RequiresActionEvent | null>(null);
  const [caseTarget, setCaseTarget] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<RequiresActionEvent>[]>(
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
        id: "Fellow",
        header: "Fellow",
        accessorFn: (e) => e.fellow.fellowName ?? "—",
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
                year: "numeric",
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
        id: "Risk outcome",
        header: "Risk outcome",
        cell: ({ row }) => {
          const outcome = row.original.riskScreenOutcome;
          if (outcome === "ANY_YES")
            return (
              <Badge className="bg-red-bg text-red-base border-red-border">Risk positive</Badge>
            );
          if (outcome === "ALL_NO")
            return (
              <Badge className="bg-green-bg text-green-base border-green-border">
                Risk negative
              </Badge>
            );
          return (
            <Badge variant="outline" className="text-shamiri-text-grey">
              Not completed
            </Badge>
          );
        },
      },
      {
        id: "Handoff",
        header: "Handoff",
        cell: ({ row }) => {
          const status = row.original.supervisorHandoffStatus;
          return <span>{status ? (HANDOFF_LABELS[status] ?? status) : "—"}</span>;
        },
      },
      {
        id: "Days waiting",
        header: "Days waiting",
        cell: ({ row }) => (
          <span className={cn("font-medium", row.original.daysSince > 3 && "text-red-base")}>
            {row.original.daysSince}d
          </span>
        ),
      },
      {
        id: "button",
        cell: ({ row }) => (
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
                onClick={() => setCaseTarget(row.original.id)}
              >
                Create clinical case
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-shamiri-black"
                onClick={() => setReviewTarget(row.original)}
              >
                Mark reviewed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableHiding: false,
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        data={events}
        columns={columns}
        className="data-table data-table-action bg-white"
        emptyStateMessage="No unactioned escalations — all referrals have been reviewed or have open cases."
        disablePagination={true}
        columnVisibilityState={{ Session: false, Handoff: false }}
      />
      {caseTarget && (
        <CreateClinicalCaseModal
          triageEventId={caseTarget}
          isOpen={true}
          onClose={() => setCaseTarget(null)}
        />
      )}
      {reviewTarget && (
        <TriageReviewModal
          triageEventId={reviewTarget.id}
          isOpen={true}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </>
  );
}
