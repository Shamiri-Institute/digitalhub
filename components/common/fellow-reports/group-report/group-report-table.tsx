"use client";

import { useMemo, useState } from "react";
import type { FellowGroupReportRow } from "#/components/common/fellow-reports/group-report/actions";
import { groupReportColumns } from "#/components/common/fellow-reports/group-report/columns";
import FellowGroupReportView from "#/components/common/group/fellow-group-report-view";
import DataTable from "#/components/data-table";

export default function GroupReportTable({ rows }: { rows: FellowGroupReportRow[] }) {
  const [selected, setSelected] = useState<FellowGroupReportRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const columns = useMemo(
    () =>
      groupReportColumns((row) => {
        setSelected(row);
        setViewOpen(true);
      }),
    [],
  );

  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={rows}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No groups found"
      />
      {selected?.report ? (
        <FellowGroupReportView
          report={selected.report}
          groupName={selected.groupName}
          open={viewOpen}
          onOpenChange={setViewOpen}
        />
      ) : null}
    </div>
  );
}
