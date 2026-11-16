"use client";

import type { ClinicalLeadCasesType } from "#/app/(platform)/cl/clinical/actions";
import { clinicalCaseColumns } from "#/app/(platform)/sc/clinical/columns";
import { presentingIssuesPhase } from "#/app/(platform)/sc/clinical/components/presenting-issues-phase";
import DataTable from "#/components/data-table";
import { deferredHidden } from "#/components/deferred";

// A row's details draw only once it is expanded, so their code loads after the page.
const ClinicalDiagnosingBoard = deferredHidden(() =>
  import("#/app/(platform)/sc/clinical/components/clinical-diagnosing-board").then(
    (mod) => mod.ClinicalDiagnosingBoard,
  ),
);
const ViewMarkClinicalSessions = deferredHidden(() =>
  import("#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions").then(
    (mod) => mod.default,
  ),
);

export default function ClinicalLeadCases({
  clinicalLeadCases,
}: {
  clinicalLeadCases: ClinicalLeadCasesType[];
}) {
  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold text-primary">My Cases ({clinicalLeadCases.length})</h2>
      <DataTable
        urlState={{ prefix: "myCases" }}
        data={clinicalLeadCases}
        getRowId={(clinicalCase) => clinicalCase.id}
        columns={clinicalCaseColumns()}
        className="data-table data-table-action bg-white lg:mt-4"
        renderSubComponent={({ row }) => (
          <div className="space-y-6 p-4">
            <ClinicalDiagnosingBoard
              key={`${row.original.id}-${presentingIssuesPhase(row.original)}`}
              currentcase={row.original}
            />
            <ViewMarkClinicalSessions currentcase={row.original} />
          </div>
        )}
        emptyStateMessage="No clinical cases created by you"
      />
    </div>
  );
}
