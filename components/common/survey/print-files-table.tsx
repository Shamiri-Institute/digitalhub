"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { SurveyPrintStatus } from "#/db/enums";
import { retryPrintRun } from "#/lib/actions/survey/print-runs";
import type { PrintRunFile } from "#/lib/survey/print-run-queries";
import { PrintStatusBadge } from "./print-runs-table";

const REFRESH_MS = 3_000;

type PrintFileRow = PrintRunFile & { part: string };

const PRINT_FILE_COLUMNS: ColumnDef<PrintFileRow>[] = [
  {
    accessorFn: (file) => file.school.schoolName,
    header: "School",
    id: "School",
  },
  {
    accessorKey: "part",
    header: "Part",
    id: "Part",
  },
  {
    accessorKey: "firstSerial",
    header: "Serials",
    id: "Serials",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.firstSerial} to {row.original.lastSerial}
      </span>
    ),
  },
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
  {
    id: "download",
    header: () => <span className="sr-only">Download</span>,
    cell: ({ row }) => {
      const file = row.original;
      if (file.status !== SurveyPrintStatus.READY) {
        return null;
      }
      return (
        <div className="text-right">
          <a
            href={`/api/survey-print-files/${file.id}`}
            className="font-medium text-shamiri-new-blue hover:underline"
            aria-label={`Download ${file.school.schoolName} ${file.part}`}
          >
            Download
          </a>{" "}
          {file.byteSize !== null && (
            <span className="text-xs text-shamiri-text-grey">
              {(file.byteSize / 1_000_000).toFixed(1)} MB
            </span>
          )}
        </div>
      );
    },
    enableHiding: false,
  },
];

/**
 * A print run's files, one per school or part of one, each downloadable once it is ready. While
 * any is unfinished the page refreshes itself, so files turn ready without a reload.
 */
export function PrintFilesTable({
  printRunId,
  files,
  runStatus,
}: {
  printRunId: string;
  files: PrintRunFile[];
  runStatus: SurveyPrintStatus;
}) {
  const router = useRouter();
  const unfinished =
    runStatus === SurveyPrintStatus.QUEUED || runStatus === SurveyPrintStatus.RENDERING;
  // effect: a timer is an external subscription; it stops once every file is finished.
  useEffect(() => {
    if (!unfinished) {
      return;
    }
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [unfinished, router]);

  const partsAtSchool = new Map<string, number>();
  for (const { schoolId } of files) {
    partsAtSchool.set(schoolId, (partsAtSchool.get(schoolId) ?? 0) + 1);
  }
  const rows = files.map((file) => {
    const parts = partsAtSchool.get(file.schoolId) ?? 1;
    return { ...file, part: parts === 1 ? "Whole school" : `${file.partNumber} of ${parts}` };
  });
  const ready = files.filter((file) => file.status === SurveyPrintStatus.READY).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-shamiri-text-grey">
          {ready} of {files.length} {files.length === 1 ? "file" : "files"} ready
        </p>
        {runStatus === SurveyPrintStatus.FAILED && <RetryButton printRunId={printRunId} />}
      </div>
      <DataTable
        data={rows}
        columns={PRINT_FILE_COLUMNS}
        className="data-table bg-white"
        emptyStateMessage="No files"
        getRowCanExpand={() => false}
        disableSearch
        disablePagination
      />
    </div>
  );
}

function RetryButton({ printRunId }: { printRunId: string }) {
  const [retrying, setRetrying] = useState(false);
  const retry = toastOnError(async () => {
    setRetrying(true);
    try {
      const response = await retryPrintRun({ printRunId });
      toast({
        variant: response.success ? "default" : "destructive",
        description: response.message,
      });
    } finally {
      setRetrying(false);
    }
  });
  return (
    <Button variant="outline" onClick={retry} disabled={retrying} loading={retrying}>
      Try failed files again
    </Button>
  );
}
