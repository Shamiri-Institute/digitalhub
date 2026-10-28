"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import DataTable from "#/components/data-table";
import { Badge, type BadgeProps } from "#/components/ui/badge";
import { SURVEY_PRINT_RUN_STATUS_LABELS, type SurveyPrintRunStatus } from "#/db/enums";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { PrintRunRows } from "#/lib/survey/print-run-queries";

const PRINT_RUN_STATUS_VARIANT: Record<SurveyPrintRunStatus, BadgeProps["variant"]> = {
  QUEUED: "outline-solid",
  RENDERING: "warning",
  READY: "shamiri-green",
  FAILED: "destructive",
};

export function PrintRunStatusBadge({ status }: { status: SurveyPrintRunStatus }) {
  return (
    <Badge variant={PRINT_RUN_STATUS_VARIANT[status]}>
      {SURVEY_PRINT_RUN_STATUS_LABELS[status]}
    </Badge>
  );
}

type PrintRunRow = PrintRunRows[number];

function printRunColumns(
  runsPath: string,
  showHub: boolean,
  timeZone: string | null,
): ColumnDef<PrintRunRow>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Created",
      id: "Created",
      cell: ({ row }) => (
        <Link
          href={`${runsPath}/${row.original.id}`}
          className="font-medium text-shamiri-new-blue hover:underline"
        >
          {timeZone ? formatDateTimeIn(row.original.createdAt, timeZone) : "Open"}
        </Link>
      ),
    },
    {
      accessorFn: (run) => run.version.survey.title,
      header: "Survey",
      id: "Survey",
      cell: ({ row }) => (
        <>
          {row.original.version.survey.title}{" "}
          <span className="text-shamiri-text-grey">{row.original.version.survey.code}</span>
        </>
      ),
    },
    {
      accessorFn: (run) => run.version.versionNumber,
      header: "Version",
      id: "Version",
      cell: ({ row }) => `v${row.original.version.versionNumber}`,
    },
    ...(showHub
      ? [
          {
            accessorFn: (run) => run.hub.hubName,
            header: "Hub",
            id: "Hub",
          } satisfies ColumnDef<PrintRunRow>,
        ]
      : []),
    {
      accessorKey: "copyCount",
      header: "Copies",
      id: "Copies",
      cell: ({ row }) => <span className="tabular-nums">{row.original.copyCount}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "Status",
      cell: ({ row }) => <PrintRunStatusBadge status={row.original.status} />,
    },
  ];
}

export function PrintRunsTable({
  runs,
  runsPath,
  showHub,
  timeZone,
}: {
  runs: PrintRunRows;
  runsPath: string;
  showHub: boolean;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
}) {
  return (
    <DataTable
      data={runs}
      columns={printRunColumns(runsPath, showHub, timeZone)}
      className="data-table bg-white"
      emptyStateMessage="No print runs yet"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
