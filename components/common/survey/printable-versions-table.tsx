"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import DataTable from "#/components/data-table";
import { SURVEY_VERSION_PREFILL_LABELS } from "#/db/enums";
import type { PrintableVersions } from "#/lib/survey/print-run-queries";
import { PrintCopiesButton } from "./print-run-dialog";

type PrintableVersionRow = PrintableVersions[number];

function printableVersionColumns(runsPath: string): ColumnDef<PrintableVersionRow>[] {
  return [
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
      cell: ({ row }) => {
        const version = row.original;
        return (
          <div className="text-right">
            <PrintCopiesButton
              version={{
                id: version.id,
                label: `${version.survey.code} v${version.versionNumber}`,
                prefill: version.prefill,
              }}
              runsPath={runsPath}
            />
          </div>
        );
      },
      enableHiding: false,
    },
  ];
}

export function PrintableVersionsTable({
  versions,
  runsPath,
}: {
  versions: PrintableVersions;
  runsPath: string;
}) {
  // memo: flexRender remounts a new cell function, closing a print button's open dialog
  const columns = useMemo(() => printableVersionColumns(runsPath), [runsPath]);
  return (
    <DataTable
      data={versions}
      columns={columns}
      className="data-table bg-white"
      emptyStateMessage="No published surveys to print"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
