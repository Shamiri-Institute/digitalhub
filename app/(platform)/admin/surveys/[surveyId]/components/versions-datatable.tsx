"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import DataTable from "#/components/data-table";
import { SurveyVersionStatus } from "#/db/enums";
import type { SurveyVersionRow } from "../../queries";
import { SurveyVersionStatusBadge } from "../../components/status-badges";
import VersionMenu, { type VersionPrinting } from "./version-menu";

function versionColumns(
  surveyId: string,
  surveyCode: string,
  hasDraft: boolean,
  printing: VersionPrinting | undefined,
): ColumnDef<SurveyVersionRow>[] {
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
      cell: ({ row }) => format(row.original.createdAt, "dd MMM yyyy"),
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
  printing,
}: {
  surveyId: string;
  surveyCode: string;
  versions: SurveyVersionRow[];
  /** Set while the survey is active, when its published versions can be printed. */
  printing?: VersionPrinting;
}) {
  const hasDraft = versions.some((v) => v.status === SurveyVersionStatus.DRAFT);

  return (
    <DataTable
      data={versions}
      columns={versionColumns(surveyId, surveyCode, hasDraft, printing)}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No versions"
      getRowCanExpand={() => false}
      disableSearch
    />
  );
}
