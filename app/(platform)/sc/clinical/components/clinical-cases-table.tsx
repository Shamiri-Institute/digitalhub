"use client";
import { Plus } from "lucide-react";
import type { ClinicalCases, SchoolsInHubData } from "#/app/(platform)/sc/clinical/action";
import { clinicalCaseColumns } from "#/app/(platform)/sc/clinical/columns";
import { ClinicalDiagnosingBoard } from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import ViewMarkClinicalSessions from "#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions";
import { AddNewClinicalCaseForm } from "#/components/common/clinical/add-new-clinical-case-form";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";

export default function ClinicalCasesTable({
  cases,
  schools,
  fellowsInProject,
  supervisorsInHub,
  currentSupervisorId,
  hubs,
}: {
  cases: ClinicalCases[];
  schools: SchoolsInHubData["schools"];
  fellowsInProject: SchoolsInHubData["fellowsInProject"];
  supervisorsInHub: SchoolsInHubData["supervisorsInHub"];
  currentSupervisorId: string;
  hubs: SchoolsInHubData["hubs"];
}) {
  const supervisorOptions = supervisorsInHub.map((s) => ({ id: s.id, name: s.supervisorName }));
  const referralSupervisors = {
    currentSupervisor: supervisorOptions.find((s) => s.id === currentSupervisorId),
    supervisorsInHub: supervisorOptions.filter((s) => s.id !== currentSupervisorId),
  };

  const renderTableActions = (
    <AddNewClinicalCaseForm
      schools={schools}
      fellowsInProject={fellowsInProject}
      supervisorsInHub={supervisorsInHub}
      hubs={hubs}
    >
      <DialogTrigger asChild={true}>
        <Button variant="brand">
          <Plus className="mr-2 h-4 w-4" />
          New case
        </Button>
      </DialogTrigger>
    </AddNewClinicalCaseForm>
  );

  return (
    <DataTable
      data={cases}
      columns={clinicalCaseColumns(referralSupervisors)}
      className="data-table data-table-action bg-white lg:mt-4"
      renderTableActions={renderTableActions}
      renderSubComponent={({ row }) => (
        <div className="space-y-6 p-4">
          <ClinicalDiagnosingBoard currentcase={row.original} />
          <ViewMarkClinicalSessions currentcase={row.original} userRole="SUPERVISOR" />
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
