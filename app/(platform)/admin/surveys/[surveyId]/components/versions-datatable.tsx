"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { PrintCopiesProvider } from "#/components/common/survey/print-run-dialog";
import DataTable from "#/components/data-table";
import { SurveyVersionStatus } from "#/db/enums";
import { formatDateIn } from "#/lib/date-utils";
import type { SurveyVersionRow } from "../../queries";
import { SurveyVersionStatusBadge } from "../../components/status-badges";
import VersionMenu from "./version-menu";

// What the cells need goes in the row, not the columns, so the columns can be built once. Rows come
// from props only: DataTable goes back to page 1 whenever they change.
type VersionTableRow = SurveyVersionRow & {
  surveyId: string;
  surveyCode: string;
  hasDraft: boolean;
  createdOn: string;
};

const VERSION_COLUMNS: ColumnDef<VersionTableRow>[] = [
  {
    accessorKey: "versionNumber",
    header: "Version",
    id: "Version",
    cell: ({ row }) => (
      <Link
        href={`/admin/surveys/${row.original.surveyId}/versions/${row.original.versionNumber}`}
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
        surveyId={row.original.surveyId}
        surveyCode={row.original.surveyCode}
        version={row.original}
        hasDraft={row.original.hasDraft}
      />
    ),
    enableHiding: false,
  },
];

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
  const rows = versions.map((version) => ({
    ...version,
    surveyId,
    surveyCode,
    hasDraft,
    createdOn: timeZone ? formatDateIn(version.createdAt, timeZone) : "",
  }));
  return (
    <PrintCopiesProvider runsPath={runsPath}>
      <DataTable
        data={rows}
        columns={VERSION_COLUMNS}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No versions"
        getRowCanExpand={() => false}
        disableSearch
      />
    </PrintCopiesProvider>
  );
}
