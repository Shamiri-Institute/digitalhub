"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { ActionButton, toastResponse } from "#/components/common/action-button";
import DataTable from "#/components/data-table";
import { Badge, type BadgeProps } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { SURVEY_UPLOAD_STATUS_LABELS, SurveyUploadStatus } from "#/db/enums";
import { rerunScanUpload } from "#/lib/actions/survey/scan-uploads";
import { formatDateTimeIn } from "#/lib/date-utils";
import { useRefreshWhile } from "#/lib/hooks/use-refresh-while";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import type { ScanUploads } from "#/lib/survey/scan-upload-queries";
import {
  isUploadUnfinished,
  mayRunAgain,
  pageOutcomeSummary,
} from "#/lib/survey/scan-upload-status";
import { formatBytes } from "#/lib/utils";

// The pipeline is notified each minute and reports at least every 5, so faster gains little.
const REFRESH_MS = 15_000;

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

type ViewerKind = SurveyViewer["kind"];

// A Research admin sees every hub's uploads and may run one again; a hub coordinator neither.
function scanUploadColumns(viewerKind: ViewerKind): ColumnDef<ScanUploadRow>[] {
  const isAdmin = viewerKind === "project";
  return [
    { accessorKey: "fileName", header: "File", id: "File" },
    ...(isAdmin
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
      accessorKey: "pagesPosted",
      header: "Pages",
      meta: { numeric: true },
      id: "Pages",
      cell: ({ row }) => pagesOf(row.original),
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "Status",
      cell: ({ row }) => <UploadStatusCell upload={row.original} />,
    },
    ...(isAdmin
      ? [
          {
            id: "rerun",
            header: () => <span className="sr-only">Run again</span>,
            enableHiding: false,
            cell: ({ row }) =>
              mayRunAgain(row.original) ? <RerunControl upload={row.original} /> : null,
          } satisfies ColumnDef<ScanUploadRow>,
        ]
      : []),
  ];
}

function RerunControl({ upload }: { upload: ScanUploadRow }) {
  const [confirming, setConfirming] = useState(false);
  const label = `Run again: ${upload.fileName}`;
  // A failed job is over. Any other the pipeline may still hold, since every queued upload has been
  // sent to, and a send that timed out may have reached it; running it again stops that job.
  if (upload.status === SurveyUploadStatus.FAILED) {
    return (
      <ActionButton
        variant="outline"
        size="sm"
        action={() => rerunScanUpload({ uploadId: upload.id })}
        aria-label={label}
      >
        Run again
      </ActionButton>
    );
  }
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)} aria-label={label}>
        Run again
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <ConfirmRerun upload={upload} onDone={() => setConfirming(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConfirmRerun({ upload, onDone }: { upload: ScanUploadRow; onDone: () => void }) {
  const { isSaving, save } = useDialogSave();
  const confirm = () =>
    save(async () => {
      toastResponse(await rerunScanUpload({ uploadId: upload.id }));
      onDone();
    });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Run {upload.fileName} again?</DialogTitle>
        <DialogDescription>
          The pipeline may already have this job but hasn&apos;t reported on it for a while. Running
          it again stops that job and reads the whole file from the start.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          variant="destructive"
          disabled={isSaving}
          loading={isSaving}
          onClick={confirm}
        >
          Run again
        </Button>
      </DialogFooter>
    </>
  );
}

function pagesOf(upload: ScanUploadRow) {
  if (upload.pageCount === null) {
    return "";
  }
  return upload.status === SurveyUploadStatus.PROCESSED
    ? String(upload.pageCount)
    : `${upload.pagesPosted} of ${upload.pageCount}`;
}

function UploadStatusCell({ upload }: { upload: ScanUploadRow }) {
  const reason =
    upload.status === SurveyUploadStatus.FAILED
      ? upload.error
      : upload.status === SurveyUploadStatus.QUEUED
        ? upload.notifyError
        : null;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <Badge variant={UPLOAD_STATUS_VARIANT[upload.status]}>
          {SURVEY_UPLOAD_STATUS_LABELS[upload.status]}
        </Badge>
        {upload.stuck && <Badge variant="destructive">Stuck</Badge>}
      </div>
      {upload.attempt > 1 && (
        <p className="text-xs text-shamiri-text-grey">Attempt {upload.attempt}</p>
      )}
      {reason && <p className="max-w-xs text-xs text-shamiri-text-grey">{reason}</p>}
      {upload.status === SurveyUploadStatus.PROCESSED && upload.pageOutcomes.length > 0 && (
        <p className="max-w-xs text-xs text-shamiri-text-grey">
          {pageOutcomeSummary(upload.pageOutcomes)}
        </p>
      )}
    </div>
  );
}

const COLUMNS: Record<ViewerKind, ColumnDef<ScanUploadRow>[]> = {
  hub: scanUploadColumns("hub"),
  project: scanUploadColumns("project"),
};

export function ScanUploadsTable({
  uploads,
  viewerKind,
  timeZone,
}: {
  uploads: ScanUploads;
  viewerKind: ViewerKind;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
}) {
  useRefreshWhile(
    uploads.some((upload) => isUploadUnfinished(upload.status)),
    REFRESH_MS,
  );

  const rows = uploads.map((upload) => ({
    ...upload,
    uploaded: upload.uploadedAt && timeZone ? formatDateTimeIn(upload.uploadedAt, timeZone) : "",
  }));
  return (
    <DataTable
      data={rows}
      columns={COLUMNS[viewerKind]}
      className="data-table bg-white"
      emptyStateMessage="No scans uploaded yet"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
