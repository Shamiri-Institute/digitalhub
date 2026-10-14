"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import DataTable from "#/components/data-table";
import { SurveyVersionStatus } from "#/db/enums";
import type { SurveyVersionRow } from "../../queries";
import { SurveyVersionStatusBadge } from "../../components/status-badges";
import VersionMenu from "./version-menu";

function versionColumns(surveyId: string, hasDraft: boolean): ColumnDef<SurveyVersionRow>[] {
  return [
    {
      accessorKey: "versionNumber",
      header: "Version",
      id: "Version",
      cell: ({ row }) => `v${row.original.versionNumber}`,
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
      cell: ({ row }) => format(row.original.createdAt, "dd MMM yyyy"),
    },
    {
      id: "button",
      cell: ({ row }) => (
        <VersionMenu surveyId={surveyId} version={row.original} hasDraft={hasDraft} />
      ),
      enableHiding: false,
    },
  ];
}

export default function VersionsDataTable({
  surveyId,
  versions,
}: {
  surveyId: string;
  versions: SurveyVersionRow[];
}) {
  const hasDraft = versions.some((v) => v.status === SurveyVersionStatus.DRAFT);

  return (
    <DataTable
      data={versions}
      columns={versionColumns(surveyId, hasDraft)}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No versions"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
