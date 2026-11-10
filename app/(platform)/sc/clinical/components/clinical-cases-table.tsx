"use client";
import { Plus } from "lucide-react";
import type { ClinicalCases, SchoolsInHubData } from "#/app/(platform)/sc/clinical/action";
import { clinicalCaseColumns } from "#/app/(platform)/sc/clinical/columns";
import {
  ClinicalDiagnosingBoard,
  presentingIssuesPhase,
} from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import ViewMarkClinicalSessions from "#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions";
import DataTable from "#/components/data-table";
import { deferred } from "#/components/deferred";
import { Button } from "#/components/ui/button";

// The new-case form loads after the page; its button is drawn until then.
const AddNewClinicalCaseForm = deferred(() =>
  import("#/components/common/clinical/add-new-clinical-case-form").then(
    (mod) => mod.AddNewClinicalCaseForm,
  ),
);

export default function ClinicalCasesTable({
  cases,
  schools,
  fellowsInProject,
  supervisorsInHub,
  currentSupervisorId,
  clinicalLeads,
  hubs,
}: {
  cases: ClinicalCases[];
  schools: SchoolsInHubData["schools"];
  fellowsInProject: SchoolsInHubData["fellowsInProject"];
  supervisorsInHub: SchoolsInHubData["supervisorsInHub"];
  currentSupervisorId: string;
  clinicalLeads: SchoolsInHubData["clinicalLeads"];
  hubs: SchoolsInHubData["hubs"];
}) {
  const supervisorOptions = supervisorsInHub.map((s) => ({ id: s.id, name: s.supervisorName }));
  const referralOptions = {
    supervisorsInHub: supervisorOptions.filter((s) => s.id !== currentSupervisorId),
    clinicalLeads: clinicalLeads.map((l) => ({ id: l.id, name: l.clinicalLeadName })),
  };

  const renderTableActions = (
    <AddNewClinicalCaseForm
      schools={schools}
      fellowsInProject={fellowsInProject}
      supervisorsInHub={supervisorsInHub}
      hubs={hubs}
      trigger={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New case
        </Button>
      }
    />
  );

  return (
    <DataTable
      urlState
      data={cases}
      getRowId={(clinicalCase) => clinicalCase.id}
      columns={clinicalCaseColumns(referralOptions)}
      className="data-table data-table-action bg-white lg:mt-4"
      renderTableActions={renderTableActions}
      renderSubComponent={({ row }) => (
        <div className="space-y-6 p-4">
          <ClinicalDiagnosingBoard
            key={`${row.original.id}-${presentingIssuesPhase(row.original)}`}
            currentcase={row.original}
          />
          <ViewMarkClinicalSessions currentcase={row.original} />
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
