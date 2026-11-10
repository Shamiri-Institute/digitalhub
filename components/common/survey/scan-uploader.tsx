"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  cancelScanUpload,
  finishScanUpload,
  keepScanUploadHeld,
  startScanUpload,
} from "#/lib/actions/survey/scan-uploads";
import { useLeaveGuard } from "#/lib/hooks/use-leave-guard";
import { putWithProgress } from "#/lib/s3/put-with-progress";
import {
  fileSha256,
  MAX_SCAN_BYTES,
  SCAN_CONTENT_TYPES,
  type ScanContentType,
  scanContentTypeOf,
} from "#/lib/survey/scan-files";
import type { UploadHubs } from "#/lib/survey/scan-upload-queries";
import { cn, formatBytes } from "#/lib/utils";

type ScanState =
  | { kind: "waiting" }
  | { kind: "checking" }
  | { kind: "uploading"; percent: number }
  | { kind: "saving" }
  | { kind: "uploaded" }
  | { kind: "refused"; reason: string }
  | { kind: "cancelled" };

type QueuedScan = {
  id: number;
  file: File;
  /** Stops this file's upload, whether it is waiting or being sent. */
  abortController: AbortController;
  contentType: ScanContentType | undefined;
  hubName?: string;
  state: ScanState;
};

const IN_PROGRESS: ScanState["kind"][] = ["waiting", "checking", "uploading", "saving"];
// Saving is left out: by then the file is in S3, and stopping would only leave it unrecorded.
const CANCELLABLE: ScanState["kind"][] = ["waiting", "checking", "uploading"];

/** A PUT that sends nothing for this long is given up, so it can't hold up the files behind it. */
const STALL_MS = 60_000;
/**
 * How long S3 has to answer once the browser has sent every byte. The browser counts bytes as sent
 * once they are in the network buffer, and a slow link may take minutes to drain it.
 */
const ANSWER_MS = 10 * 60_000;
/** How often a PUT in progress renews the hour before anyone else may take the upload over. */
const HOLD_RENEW_MS = 10 * 60_000;

function refused(reason: string): ScanState {
  return { kind: "refused", reason };
}

function checkBeforeSending(file: File, contentType: ScanContentType | undefined): ScanState {
  if (!contentType) {
    return refused("Not a PDF, JPEG or PNG file");
  }
  if (file.size > MAX_SCAN_BYTES) {
    return refused(`Larger than ${formatBytes(MAX_SCAN_BYTES)}`);
  }
  return { kind: "waiting" };
}

function giveUpScanUpload(uploadId: string) {
  cancelScanUpload({ uploadId })
    .then((cancelled) => !cancelled.success && console.error(cancelled.message))
    .catch((error: unknown) => console.error("Could not give up the scan upload", error));
}

/**
 * Takes any number of scanned files and uploads them one at a time. Each file is hashed first, so
 * one already uploaded is refused before it is sent; a refused file doesn't hold up the rest.
 * `hubs` is given to a Research admin, who chooses the hub; a coordinator's is their own.
 */
export function ScanUploader({ hubs }: { hubs?: UploadHubs }) {
  const [chosenHubId, setChosenHubId] = useState<string>();
  const [scans, setScans] = useState<QueuedScan[]>([]);
  const [dragging, setDragging] = useState(false);
  const nextScanId = useRef(0);
  // Uploads run in the order files were added, each after the one before has settled.
  const uploadQueue = useRef(Promise.resolve());
  const unfinishedUploadControllers = useRef(new Set<AbortController>());

  const needsHub = hubs !== undefined && !chosenHubId;
  const uploadsInProgress = scans.filter((scan) => IN_PROGRESS.includes(scan.state.kind)).length;
  const uploadedCount = scans.filter((scan) => scan.state.kind === "uploaded").length;
  const refusedCount = scans.filter((scan) => scan.state.kind === "refused").length;

  useLeaveGuard(uploadsInProgress > 0, "Scans are still uploading. Leave and stop them?");

  // effect: stops the uploads still running or waiting when the uploader leaves the page
  useEffect(() => {
    const unfinishedControllers = unfinishedUploadControllers.current;
    return () => {
      for (const controller of unfinishedControllers) {
        controller.abort();
      }
    };
  }, []);

  const setScanState = (id: number, state: ScanState) =>
    setScans((current) => current.map((scan) => (scan.id === id ? { ...scan, state } : scan)));

  const upload = async (
    scan: QueuedScan,
    contentType: ScanContentType,
    uploadHubId: string | undefined,
  ) => {
    const { id, file, abortController } = scan;
    const { signal } = abortController;
    let uploadId: string | undefined;
    try {
      signal.throwIfAborted();
      setScanState(id, { kind: "checking" });
      const sha256 = await fileSha256(file, signal);
      // Hashing only checks between chunks, so a cancel during the last one lands here.
      signal.throwIfAborted();
      const started = await startScanUpload({
        hubId: uploadHubId,
        fileName: file.name,
        contentType,
        byteSize: file.size,
        sha256,
      });
      uploadId = started.data?.uploadId;
      signal.throwIfAborted();
      if (!started.success || !started.data) {
        return setScanState(id, refused(started.message));
      }
      if (!started.data.stored) {
        await sendFile(scan, started.data);
      }
      setScanState(id, { kind: "saving" });
      const finished = await finishScanUpload({ uploadId: started.data.uploadId });
      setScanState(id, finished.success ? { kind: "uploaded" } : refused(finished.message));
    } catch (error) {
      if (signal.aborted) {
        // Cancelled, or the app navigated away: free the file for anyone at once. Closing the tab
        // runs nothing, so then the file is held until the hour is up.
        if (uploadId) {
          giveUpScanUpload(uploadId);
        }
        return;
      }
      setScanState(id, refused("Something went wrong. Add the file again"));
      reportError(error);
    } finally {
      unfinishedUploadControllers.current.delete(abortController);
    }
  };

  /**
   * PUTs the file, keeping the upload this user's while it is sent. A failed PUT doesn't throw: its
   * bytes may still have arrived, which only the finish can tell. A cancel throws.
   */
  const sendFile = async (
    { id, file, abortController: { signal } }: QueuedScan,
    { uploadId, url, headers }: { uploadId: string; url: string; headers: Record<string, string> },
  ) => {
    setScanState(id, { kind: "uploading", percent: 0 });
    let shownPercent = 0;
    const keepHeld = setInterval(
      () =>
        void keepScanUploadHeld({ uploadId })
          .then(
            (kept) => !kept.success && console.error("Lost the scan upload's hold", kept.message),
          )
          .catch((error: unknown) => console.error("Could not keep the scan upload held", error)),
      HOLD_RENEW_MS,
    );
    try {
      await putWithProgress(
        url,
        headers,
        file,
        (bytesSent) => {
          const percent = Math.round((bytesSent / file.size) * 100);
          if (percent !== shownPercent) {
            shownPercent = percent;
            setScanState(id, { kind: "uploading", percent });
          }
        },
        { signal, stallMs: STALL_MS, answerMs: ANSWER_MS },
      );
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      reportError(error);
    } finally {
      clearInterval(keepHeld);
    }
  };

  const cancelUpload = (scan: QueuedScan) => {
    scan.abortController.abort();
    unfinishedUploadControllers.current.delete(scan.abortController);
    setScanState(scan.id, { kind: "cancelled" });
  };

  const addFiles = (files: File[]) => {
    if (needsHub || files.length === 0) {
      return;
    }
    const hubName = hubs?.find((h) => h.id === chosenHubId)?.hubName;
    const added = files.map((file) => {
      const contentType = scanContentTypeOf(file);
      return {
        id: nextScanId.current++,
        file,
        abortController: new AbortController(),
        contentType,
        hubName,
        state: checkBeforeSending(file, contentType),
      };
    });
    setScans((current) => [...current, ...added]);
    for (const scan of added) {
      const { contentType } = scan;
      if (scan.state.kind === "waiting" && contentType) {
        unfinishedUploadControllers.current.add(scan.abortController);
        // upload() settles every file itself; the catch keeps one surprise from stopping the rest.
        uploadQueue.current = uploadQueue.current
          .then(() => upload(scan, contentType, chosenHubId))
          .catch((error: unknown) => console.error("Scan upload failed", error));
      }
    }
  };

  return (
    <div className="space-y-3">
      {hubs && (
        <div className="space-y-1.5">
          <Label htmlFor="scan-hub">Hub</Label>
          {/* "" while no hub is chosen keeps the Select controlled from the start. */}
          <Select value={chosenHubId ?? ""} onValueChange={setChosenHubId}>
            <SelectTrigger id="scan-hub" aria-label="Hub" className="w-64">
              <SelectValue placeholder="Choose a hub" />
            </SelectTrigger>
            <SelectContent>
              {hubs.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.hubName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag-and-drop onto the file input's label */}
      <label
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(!needsHub);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-info-border bg-info-bg/50 px-6 py-9 text-center transition-colors duration-150",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
          needsHub
            ? "cursor-not-allowed border-border bg-muted"
            : "cursor-pointer hover:border-primary hover:bg-info-bg",
          dragging && "border-solid border-primary bg-info-bg",
        )}
      >
        <Icons.fileUp
          aria-hidden
          className={cn("mb-1 size-7", needsHub ? "text-muted-foreground" : "text-primary")}
        />
        <span className="font-medium text-foreground">
          {needsHub ? (
            "Choose a hub to upload its scans"
          ) : (
            <>
              Drop scans here, or{" "}
              <span className="text-primary underline underline-offset-4">choose files</span>
            </>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          PDF, JPEG or PNG, up to {formatBytes(MAX_SCAN_BYTES)} each. Add as many as you like.
        </span>
        <input
          type="file"
          multiple
          accept={SCAN_CONTENT_TYPES.join(",")}
          aria-label="Scanned files"
          disabled={needsHub}
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            // So the same file can be chosen again after it was refused.
            event.target.value = "";
          }}
        />
      </label>

      {scans.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {[
                `${uploadedCount} uploaded`,
                uploadsInProgress > 0 && `${uploadsInProgress} to go`,
                refusedCount > 0 && `${refusedCount} not uploaded`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploadsInProgress > 0}
              onClick={() => setScans([])}
            >
              Clear list
            </Button>
          </div>
          <ul aria-label="Files added" className="divide-y divide-border">
            {scans.map((scan) => (
              <QueuedScanRow key={scan.id} scan={scan} onCancel={() => cancelUpload(scan)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QueuedScanRow({ scan, onCancel }: { scan: QueuedScan; onCancel: () => void }) {
  const { state } = scan;
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <ScanStateIcon state={state} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{scan.file.name}</p>
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{formatBytes(scan.file.size)}</span>
          {scan.hubName && <> · {scan.hubName}</>}
        </p>
        {state.kind === "refused" && (
          <p className="mt-0.5 text-sm text-destructive">{state.reason}</p>
        )}
        {state.kind === "uploading" && (
          <progress
            value={state.percent}
            max={100}
            aria-label={`Uploading ${scan.file.name}`}
            className="mt-1.5 block h-1 w-full appearance-none overflow-hidden rounded-full bg-info-bg [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-info-bg [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-200"
          />
        )}
      </div>
      {state.kind !== "refused" && (
        <span
          className={cn(
            "shrink-0 text-sm tabular-nums",
            state.kind === "uploaded" ? "text-success" : "text-muted-foreground",
          )}
        >
          {scanStateText(state)}
        </span>
      )}
      {CANCELLABLE.includes(state.kind) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label={`Cancel ${scan.file.name}`}
          onClick={onCancel}
        >
          <Icons.xIcon aria-hidden className="size-4" />
        </Button>
      )}
    </li>
  );
}

function scanStateText(state: Exclude<ScanState, { kind: "refused" }>) {
  switch (state.kind) {
    case "uploading":
      return `${state.percent}%`;
    case "waiting":
      return "Waiting";
    case "checking":
      return "Checking";
    case "saving":
      return "Saving";
    case "uploaded":
      return "Uploaded";
    case "cancelled":
      return "Cancelled";
  }
}

function ScanStateIcon({ state }: { state: ScanState }) {
  const className = "size-4 shrink-0";
  switch (state.kind) {
    case "uploaded":
      return <Icons.check aria-hidden className={cn(className, "text-success")} />;
    case "refused":
      return <Icons.alertCircle aria-hidden className={cn(className, "text-destructive")} />;
    case "waiting":
      return <Icons.fileUp aria-hidden className={cn(className, "text-muted-foreground")} />;
    case "cancelled":
      return <Icons.minusCircle aria-hidden className={cn(className, "text-muted-foreground")} />;
    default:
      return (
        <Icons.loaderCircle aria-hidden className={cn(className, "animate-spin text-primary")} />
      );
  }
}
