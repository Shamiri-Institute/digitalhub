"use client";

import type { ColumnDef } from "@tanstack/react-table";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { SURVEY_VERSION_PREFILL_LABELS } from "#/db/enums";
import type { PrintableVersions } from "#/lib/survey/print-run-queries";
import { PrintCopiesProvider, usePrintCopies } from "./print-run-dialog";

type PrintableVersionRow = PrintableVersions[number];

function PrintCopiesButton({ version }: { version: PrintableVersionRow }) {
  const printCopies = usePrintCopies();
  const label = `${version.survey.code} v${version.versionNumber}`;
  return (
    <Button
      variant="outline"
      aria-label={`Print copies of ${label}`}
      onClick={() => printCopies?.({ id: version.id, label, prefill: version.prefill })}
    >
      Print copies
    </Button>
  );
}

const PRINTABLE_VERSION_COLUMNS: ColumnDef<PrintableVersionRow>[] = [
  {
    accessorFn: (version) => version.survey.title,
    header: "Survey",
    id: "Survey",
    cell: ({ row }) => (
      <>
        {row.original.survey.title}{" "}
        <span className="text-shamiri-text-grey">{row.original.survey.code}</span>
      </>
    ),
  },
  {
    accessorKey: "versionNumber",
    header: "Version",
    id: "Version",
    cell: ({ row }) => `v${row.original.versionNumber}`,
  },
  {
    accessorKey: "prefill",
    header: "Prints",
    id: "Prints",
    cell: ({ row }) => SURVEY_VERSION_PREFILL_LABELS[row.original.prefill],
  },
  {
    id: "print",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="text-right">
        <PrintCopiesButton version={row.original} />
      </div>
    ),
    enableHiding: false,
  },
];

export function PrintableVersionsTable({
  versions,
  runsPath,
}: {
  versions: PrintableVersions;
  runsPath: string;
}) {
  return (
    <PrintCopiesProvider runsPath={runsPath}>
      <DataTable
        data={versions}
        columns={PRINTABLE_VERSION_COLUMNS}
        className="data-table bg-white"
        emptyStateMessage="No published surveys to print"
        getRowCanExpand={() => false}
        disableSearch
        // A project has a few published versions at a time; one list keeps every Print button in view.
        disablePagination
      />
    </PrintCopiesProvider>
  );
}
