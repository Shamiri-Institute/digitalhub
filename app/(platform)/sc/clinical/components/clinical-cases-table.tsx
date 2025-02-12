"use client";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import { columns } from "#/app/(platform)/sc/clinical/columns";
import DataTable from "#/components/data-table";

export default async function ClinicalCasesTable({
  cases,
}: {
  cases: ClinicalCases[];
}) {
  return (
    <DataTable
      data={cases}
      columns={columns}
      className="data-table data-table-action mt-4 bg-white"
      renderSubComponent={({ row }) => (
        <DataTable
          data={[]}
          editColumns={false}
          columns={[]}
          className="data-table data-table-action border-0 bg-white"
          emptyStateMessage="No clinical cases found"
        />
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
