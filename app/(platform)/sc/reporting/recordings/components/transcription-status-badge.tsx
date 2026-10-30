"use client";

import type { TranscriptionStatus } from "#/db/enums";
import { Badge, type BadgeProps } from "#/components/ui/badge";

interface TranscriptionStatusBadgeProps {
  status: TranscriptionStatus | null;
  errorMessage: string | null;
}

const statusConfig: Record<TranscriptionStatus, { label: string; variant: BadgeProps["variant"] }> =
  {
    QUEUED: { label: "Queued", variant: "warning" },
    PROCESSING: { label: "Transcribing", variant: "default" },
    COMPLETED: { label: "Ready", variant: "shamiri-green" },
    FAILED: { label: "Failed", variant: "destructive" },
  };

export default function TranscriptionStatusBadge({
  status,
  errorMessage,
}: TranscriptionStatusBadgeProps) {
  if (status === null) return <span className="text-shamiri-text-grey">-</span>;
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} title={errorMessage ?? undefined}>
      {config.label}
    </Badge>
  );
}
