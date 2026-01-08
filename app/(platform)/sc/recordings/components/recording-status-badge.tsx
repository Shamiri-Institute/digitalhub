"use client";

import type { RecordingProcessingStatus } from "@prisma/client";
import { Badge } from "#/components/ui/badge";

interface RecordingStatusBadgeProps {
  status: RecordingProcessingStatus;
}

const statusConfig: Record<
  RecordingProcessingStatus,
  { label: string; variant: "warning" | "default" | "shamiri-green" | "destructive" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  PROCESSING: { label: "Processing", variant: "default" },
  COMPLETED: { label: "Completed", variant: "shamiri-green" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export default function RecordingStatusBadge({ status }: RecordingStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
