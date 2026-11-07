"use client";

import type { ColumnDef } from "@tanstack/react-table";

import DataTable from "#/components/data-table";
import { Badge, type BadgeProps } from "#/components/ui/badge";
import { SURVEY_UPLOAD_STATUS_LABELS, type SurveyUploadStatus } from "#/db/enums";
import { formatDateTimeIn } from "#/lib/date-utils";
import type { ScanUploads } from "#/lib/survey/scan-upload-queries";
import { formatBytes } from "#/lib/utils";

const UPLOAD_STATUS_VARIANT: Record<SurveyUploadStatus, BadgeProps["variant"]> = {
  PENDING: "outline-solid",
  UPLOADED: "outline-solid",
  QUEUED: "outline-solid",
  PROCESSING: "warning",
  PROCESSED: "shamiri-green",
  FAILED: "destructive",
};

// The date goes in the row, so the columns can be built once (as in print-runs-table.tsx).
type ScanUploadRow = ScanUploads[number] & { uploaded: string };

function scanUploadColumns(showHub: boolean): ColumnDef<ScanUploadRow>[] {
  return [
    { accessorKey: "fileName", header: "File", id: "File" },
    ...(showHub
      ? [
          {
            accessorFn: (upload) => upload.hub.hubName,
            header: "Hub",
            id: "Hub",
          } satisfies ColumnDef<ScanUploadRow>,
        ]
      : []),
    {
      accessorKey: "uploadedAt",
      header: "Uploaded",
      id: "Uploaded",
      cell: ({ row }) => row.original.uploaded,
    },
    {
      accessorFn: (upload) => upload.uploadedByUser.name ?? upload.uploadedByUser.email,
      header: "By",
      id: "By",
    },
    {
      accessorKey: "byteSize",
      header: "Size",
      meta: { numeric: true },
      id: "Size",
      cell: ({ row }) => formatBytes(row.original.byteSize),
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "Status",
      cell: ({ row }) => (
        <Badge variant={UPLOAD_STATUS_VARIANT[row.original.status]}>
          {SURVEY_UPLOAD_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
  ];
}

const SCAN_UPLOAD_COLUMNS = scanUploadColumns(false);
const SCAN_UPLOAD_COLUMNS_WITH_HUB = scanUploadColumns(true);

export function ScanUploadsTable({
  uploads,
  showHub,
  timeZone,
}: {
  uploads: ScanUploads;
  showHub: boolean;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
}) {
  const rows = uploads.map((upload) => ({
    ...upload,
    uploaded: upload.uploadedAt && timeZone ? formatDateTimeIn(upload.uploadedAt, timeZone) : "",
  }));
  return (
    <DataTable
      data={rows}
      columns={showHub ? SCAN_UPLOAD_COLUMNS_WITH_HUB : SCAN_UPLOAD_COLUMNS}
      className="data-table bg-white"
      emptyStateMessage="No scans uploaded yet"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
