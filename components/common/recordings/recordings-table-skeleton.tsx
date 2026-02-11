"use client";

import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";

export default function RecordingsTableSkeleton({
  includeSupervisor = false,
}: {
  includeSupervisor?: boolean;
}) {
  const headers = [
    { header: "Date Uploaded", id: "dateUploaded" },
    { header: "Fellow", id: "fellow" },
    ...(includeSupervisor ? [{ header: "Supervisor", id: "supervisor" }] : []),
    { header: "School", id: "school" },
    { header: "Group", id: "group" },
    { header: "Session", id: "session" },
    { header: "Size", id: "size" },
    { header: "Status", id: "status" },
    { header: "Score", id: "score" },
  ];

  const loadingColumns = headers.map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  function renderTableActions() {
    return (
      <Button disabled className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload Recording</span>
      </Button>
    );
  }

  return (
    <div className="px-6 py-5">
      <DataTable
        key="skeleton-recordings-table"
        columns={loadingColumns}
        data={Array.from(Array(5).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
        renderTableActions={renderTableActions()}
      />
    </div>
  );
}
