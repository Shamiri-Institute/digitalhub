import type { RecordingProcessingStatus } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import type { Dispatch, SetStateAction } from "react";

export interface RecordingTableData {
  id: string;
  createdAt: Date;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  status: RecordingProcessingStatus;
  processedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  overallScore: string | null;
  fidelityFeedback: JsonValue;
  fellowName: string;
  supervisorName?: string;
  schoolName: string;
  groupName: string;
  sessionType: string;
  sessionDate: Date;
  sessionName: string;
}

export interface ColumnState {
  setViewFeedbackDialog: Dispatch<SetStateAction<boolean>>;
  setSelectedRecording: Dispatch<SetStateAction<RecordingTableData | null>>;
  onRetry: (id: string) => Promise<{ success: boolean; message: string }>;
}

export function formatRecordingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
