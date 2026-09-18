"use client";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { SkeletonCell } from "#/components/ui/skeleton";

export default function ClinicalTableLoader() {
  const loadingColumns = [
    { header: "School", id: "school" },
    { header: "Pseudonym", id: "pseudonym" },
    { header: "Date Added", id: "dateAdded" },
    { header: "Case Status", id: "caseStatus" },
    { header: "Risk", id: "risk" },
    { header: "Age", id: "age" },
    { header: "Referral From", id: "referralFrom" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: SkeletonCell,
  }));

  function renderTableActions() {
    return (
      <Button variant="brand" disabled>
        New Case
      </Button>
    );
  }

  return (
    <DataTable
      key="skeleton-clinical-cases-table"
      columns={loadingColumns}
      data={Array.from(Array(10).keys()).map(() => ({}))}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
    />
  );
}
