"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import DataTable from "#/components/data-table";
import { Badge, type BadgeProps } from "#/components/ui/badge";
import { SURVEY_PRINT_STATUS_LABELS, type SurveyPrintStatus } from "#/db/enums";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { PrintRunRows } from "#/lib/survey/print-run-queries";

const PRINT_STATUS_VARIANT: Record<SurveyPrintStatus, BadgeProps["variant"]> = {
  QUEUED: "outline-solid",
  RENDERING: "warning",
  READY: "shamiri-green",
  FAILED: "destructive",
};

/** A print run's or print file's status. */
export function PrintStatusBadge({ status }: { status: SurveyPrintStatus }) {
  return <Badge variant={PRINT_STATUS_VARIANT[status]}>{SURVEY_PRINT_STATUS_LABELS[status]}</Badge>;
}

// The link and date go in the row, not the columns, so the columns can be built once: a cell
// function made on each render is a new component type to React and remounts every cell.
type PrintRunRow = PrintRunRows[number] & { href: string; created: string };

function printRunColumns(showHub: boolean): ColumnDef<PrintRunRow>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Created",
      id: "Created",
      cell: ({ row }) => (
        <Link
          href={row.original.href}
          className="font-medium text-shamiri-new-blue hover:underline"
        >
          {row.original.created}
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
      cell: ({ row }) => <PrintStatusBadge status={row.original.status} />,
    },
  ];
}

const PRINT_RUN_COLUMNS = printRunColumns(false);
const PRINT_RUN_COLUMNS_WITH_HUB = printRunColumns(true);

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
  const rows = runs.map((run) => ({
    ...run,
    href: `${runsPath}/${run.id}`,
    created: timeZone ? formatDateTimeIn(run.createdAt, timeZone) : "Open",
  }));
  return (
    <DataTable
      data={rows}
      columns={showHub ? PRINT_RUN_COLUMNS_WITH_HUB : PRINT_RUN_COLUMNS}
      className="data-table bg-white"
      emptyStateMessage="No print runs yet"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
