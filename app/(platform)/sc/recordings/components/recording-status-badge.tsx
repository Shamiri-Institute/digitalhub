"use client";

import type { RecordingProcessingStatus } from "@prisma/client";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";

interface RecordingStatusBadgeProps {
  status: RecordingProcessingStatus;
  className?: string;
}

const statusConfig: Record<RecordingProcessingStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-bg text-yellow-700 border-yellow-border hover:bg-yellow-bg",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-bg text-blue-base border-blue-border hover:bg-blue-bg",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-bg text-green-base border-green-border hover:bg-green-bg",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-bg text-red-base border-red-border hover:bg-red-bg",
  },
};

export default function RecordingStatusBadge({ status, className }: RecordingStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
