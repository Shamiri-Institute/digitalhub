"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { useMemo } from "react";

import DataTable from "#/components/data-table";
import { SurveyVersionStatus } from "#/db/enums";
import type { SurveyVersionRow } from "../../queries";
import { SurveyVersionStatusBadge } from "../../components/status-badges";
import VersionMenu, { type VersionPrinting } from "./version-menu";

// The date goes in the row, not the columns: the time zone arrives on a refresh, and new columns
// would remount the version menu and close a print dialog it has open.
type VersionTableRow = SurveyVersionRow & { createdOn: string };

function versionColumns(
  surveyId: string,
  surveyCode: string,
  hasDraft: boolean,
  printing: VersionPrinting | undefined,
): ColumnDef<VersionTableRow>[] {
  return [
    {
      accessorKey: "versionNumber",
      header: "Version",
      id: "Version",
      cell: ({ row }) => (
        <Link
          href={`/admin/surveys/${surveyId}/versions/${row.original.versionNumber}`}
          className="font-medium text-shamiri-new-blue hover:underline"
        >
          v{row.original.versionNumber}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "Status",
      cell: ({ row }) => <SurveyVersionStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "pageCount",
      header: "Pages",
      id: "Pages",
    },
    {
      accessorKey: "questionCount",
      header: "Questions",
      id: "Questions",
    },
    {
      id: "Copied from",
      header: "Copied from",
      accessorFn: (version) => version.basedOnVersion?.versionNumber,
      cell: ({ row }) => {
        const basedOn = row.original.basedOnVersion;
        return basedOn ? `v${basedOn.versionNumber}` : "";
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      id: "Created",
      cell: ({ row }) => row.original.createdOn,
    },
    {
      id: "button",
      cell: ({ row }) => (
        <VersionMenu
          surveyId={surveyId}
          surveyCode={surveyCode}
          version={row.original}
          hasDraft={hasDraft}
          printing={printing}
        />
      ),
      enableHiding: false,
    },
  ];
}

export default function VersionsDataTable({
  surveyId,
  surveyCode,
  versions,
  runsPath,
  timeZone,
}: {
  surveyId: string;
  surveyCode: string;
  versions: SurveyVersionRow[];
  /** Set while the survey is active, when its published versions can be printed. */
  runsPath?: string;
  /** The viewer's, from `viewerTimeZone()`; null until the browser has set it. */
  timeZone: string | null;
}) {
  const hasDraft = versions.some((v) => v.status === SurveyVersionStatus.DRAFT);
  // memo: flexRender remounts a new cell function, closing a version menu's open print dialog
  const columns = useMemo(
    () => versionColumns(surveyId, surveyCode, hasDraft, runsPath ? { runsPath } : undefined),
    [surveyId, surveyCode, hasDraft, runsPath],
  );
  const rows = versions.map((version) => ({
    ...version,
    createdOn: timeZone ? formatInTimeZone(version.createdAt, timeZone, "dd MMM yyyy") : "",
  }));

  return (
    <DataTable
      data={rows}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No versions"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
