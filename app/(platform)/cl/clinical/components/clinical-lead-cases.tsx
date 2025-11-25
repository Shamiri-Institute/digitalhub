"use client";

import type { ClinicalLeadCasesType } from "#/app/(platform)/cl/clinical/actions";
import { columns } from "#/app/(platform)/sc/clinical/columns";
import { ClinicalDiagnosingBoard } from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import ViewMarkClinicalSessions from "#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions";
import DataTable from "#/components/data-table";

export default function ClinicalLeadCases({
  clinicalLeadCases,
}: {
  clinicalLeadCases: ClinicalLeadCasesType[];
}) {
  return (
    <div className="mt-4">
      <h2 className="text-lg font-medium">My Cases ({clinicalLeadCases.length})</h2>
      <DataTable
        data={clinicalLeadCases}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        renderSubComponent={({ row }) => (
          <div className="space-y-6 p-4">
            <ClinicalDiagnosingBoard currentcase={row.original} />
            <ViewMarkClinicalSessions currentcase={row.original} userRole="CLINICAL_LEAD" />
          </div>
        )}
        emptyStateMessage="No clinical cases created by you"
      />
    </div>
  );
}
