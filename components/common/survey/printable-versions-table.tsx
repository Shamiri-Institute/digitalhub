"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { SURVEY_VERSION_PREFILL_LABELS } from "#/db/enums";
import type { PrintableVersions } from "#/lib/survey/print-run-queries";
import { PrintRunDialog, type PrintRequest, requestPrinting } from "./print-run-dialog";

// The print handler goes in the row, not the columns, so the columns can be built once.
type PrintableVersionRow = PrintableVersions[number] & { label: string; onPrint: () => void };

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
        <Button
          variant="outline"
          aria-label={`Print copies of ${row.original.label}`}
          onClick={row.original.onPrint}
        >
          Print copies
        </Button>
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
  const [printing, setPrinting] = useState<PrintRequest | null>(null);
  const rows = versions.map((version) => {
    const label = `${version.survey.code} v${version.versionNumber}`;
    return {
      ...version,
      label,
      onPrint: () =>
        setPrinting(requestPrinting({ id: version.id, label, prefill: version.prefill })),
    };
  });
  return (
    <>
      <DataTable
        data={rows}
        columns={PRINTABLE_VERSION_COLUMNS}
        className="data-table bg-white"
        emptyStateMessage="No published surveys to print"
        getRowCanExpand={() => false}
        disableSearch
        // A project has a few published versions at a time; one list keeps every Print button in view.
        disablePagination
      />
      <PrintRunDialog printing={printing} runsPath={runsPath} onClose={() => setPrinting(null)} />
    </>
  );
}
