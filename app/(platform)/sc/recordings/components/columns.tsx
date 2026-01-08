"use client";

import type { RecordingProcessingStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import RecordingStatusBadge from "./recording-status-badge";
import RecordingsDataTableMenu from "./recordings-datatable-menu";

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
  fidelityFeedback: unknown;
  fellowName: string;
  schoolName: string;
  groupName: string;
  sessionType: string;
  sessionDate: Date;
  sessionName: string;
}

export interface ColumnState {
  setViewFeedbackDialog: Dispatch<SetStateAction<boolean>>;
  setSelectedRecording: Dispatch<SetStateAction<RecordingTableData | null>>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const recordingColumns = (state: ColumnState): ColumnDef<RecordingTableData>[] => [
  {
    accessorKey: "createdAt",
    header: "Date Uploaded",
    id: "dateUploaded",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "fellowName",
    header: "Fellow",
    id: "fellow",
  },
  {
    accessorKey: "schoolName",
    header: "School",
    id: "school",
  },
  {
    accessorKey: "groupName",
    header: "Group",
    id: "group",
  },
  {
    accessorKey: "sessionName",
    header: "Session",
    id: "session",
  },
  {
    accessorKey: "fileSize",
    header: "Size",
    id: "size",
    cell: ({ row }) => formatFileSize(row.original.fileSize),
  },
  {
    accessorKey: "status",
    header: "Status",
    id: "status",
    cell: ({ row }) => <RecordingStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "overallScore",
    header: "Score",
    id: "score",
    cell: ({ row }) => row.original.overallScore ?? "-",
  },
  {
    id: "actions",
    cell: ({ row }) => <RecordingsDataTableMenu recording={row.original} state={state} />,
    enableHiding: false,
  },
];
