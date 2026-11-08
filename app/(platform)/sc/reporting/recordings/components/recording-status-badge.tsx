"use client";

import type { RecordingProcessingStatus } from "#/db/enums";
import { Badge, type BadgeProps } from "#/components/ui/badge";

interface RecordingStatusBadgeProps {
  status: RecordingProcessingStatus;
  hasTranscriptionRun: boolean;
  hasGaps: boolean;
  errorMessage: string | null;
}

const statusConfig: Record<
  RecordingProcessingStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "default" },
  COMPLETED: { label: "Completed", variant: "shamiri-green" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export default function RecordingStatusBadge({
  status,
  hasTranscriptionRun,
  hasGaps,
  errorMessage,
}: RecordingStatusBadgeProps) {
  // Only recordings of supervisors in the fidelity A/B test get a transcription run; nothing ever
  // processes the others, so they are uploaded rather than pending.
  if (status === "PENDING" && !hasTranscriptionRun) {
    return <Badge variant="secondary">Uploaded</Badge>;
  }
  if (status === "COMPLETED" && hasGaps) {
    return (
      <Badge variant="warning" title="Parts of the recording could not be transcribed">
        Completed with gaps
      </Badge>
    );
  }
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} title={errorMessage ?? undefined}>
      {config.label}
    </Badge>
  );
}
