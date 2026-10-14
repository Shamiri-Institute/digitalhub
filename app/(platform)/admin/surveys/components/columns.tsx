"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { SURVEY_VERSION_STATUS_LABELS } from "#/db/enums";
import type { SurveyListItem } from "../queries";
import { SurveyStatusBadge } from "./status-badges";

export const columns: ColumnDef<SurveyListItem>[] = [
  {
    accessorKey: "code",
    header: "Code",
    id: "Code",
  },
  {
    accessorKey: "title",
    header: "Title",
    id: "Title",
    cell: ({ row }) => (
      <Link
        href={`/admin/surveys/${row.original.id}`}
        className="font-medium text-shamiri-new-blue hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "Latest version",
    header: "Latest version",
    accessorFn: (survey) => survey.latestVersion?.versionNumber,
    cell: ({ row }) => {
      const version = row.original.latestVersion;
      return version
        ? `v${version.versionNumber} · ${SURVEY_VERSION_STATUS_LABELS[version.status]}`
        : "";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    id: "Status",
    cell: ({ row }) => <SurveyStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    id: "Created",
    cell: ({ row }) => format(row.original.createdAt, "dd MMM yyyy"),
  },
];
