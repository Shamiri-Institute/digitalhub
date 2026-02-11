"use client";

import type { ColumnDef } from "@tanstack/react-table";
import RecordingStatusBadge from "#/components/common/recordings/recording-status-badge";
import {
  type ColumnState,
  formatFileSize,
  formatRecordingDate,
  type RecordingTableData,
} from "./recording-types";
import RecordingsDataTableMenu from "./recordings-datatable-menu";

export function createRecordingColumns(
  state: ColumnState,
  config: { includeSupervisor?: boolean } = {},
): ColumnDef<RecordingTableData>[] {
  const columns: ColumnDef<RecordingTableData>[] = [
    {
      accessorKey: "createdAt",
      header: "Date Uploaded",
      id: "dateUploaded",
      cell: ({ row }) => formatRecordingDate(row.original.createdAt),
    },
    {
      accessorKey: "fellowName",
      header: "Fellow",
      id: "fellow",
    },
  ];

  if (config.includeSupervisor) {
    columns.push({
      accessorKey: "supervisorName",
      header: "Supervisor",
      id: "supervisor",
    });
  }

  columns.push(
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
  );

  return columns;
}
