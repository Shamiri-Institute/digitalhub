import { Plus } from "lucide-react";
import {
  getClinicalCasesCreatedByClinicalLead,
  getClinicalCasesData,
  getClinicalCasesInHub,
  getSchoolsInClinicalLeadHub,
} from "#/app/(platform)/cl/clinical/actions";
import ClinicalLeadCases from "#/app/(platform)/cl/clinical/components/clinical-lead-cases";
import { AddNewClinicalCaseForm } from "#/components/common/clinical/add-new-clinical-case-form";
import CasesBreakdown from "#/components/common/clinical/cases-breakdown";
import AllHubClinicalCasesTable from "#/components/common/clinical/hub-clinical-cases-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";

export default async function ClinicalPage() {
  const cases = await getClinicalCasesInHub();
  const casesData = await getClinicalCasesData();
  const allClinicalLeadCases = await getClinicalCasesCreatedByClinicalLead();
  const { schools, fellowsInProject, supervisorsInHub, currentClinicalLeadId, hubs } =
    await getSchoolsInClinicalLeadHub();

  if (!currentClinicalLeadId) {
    throw new Error("Clinical lead not found");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddNewClinicalCaseForm
          schools={schools}
          fellowsInProject={fellowsInProject}
          supervisorsInHub={supervisorsInHub}
          creatorId={currentClinicalLeadId}
          hubs={hubs}
          userRole="CLINICAL_LEAD"
        >
          <DialogTrigger asChild={true}>
            <Button variant="brand">
              <Plus className="mr-2 h-4 w-4" />
              New case
            </Button>
          </DialogTrigger>
        </AddNewClinicalCaseForm>
      </div>
      <CasesBreakdown
        casesByStatus={casesData.casesByStatus}
        casesByRiskStatus={casesData.casesByRiskStatus}
        casesBySession={casesData.casesBySession}
        casesBySupervisor={casesData.casesBySupervisor}
      />
      <AllHubClinicalCasesTable
        cases={cases}
        title="All Supervisor Cases In This Hub"
        emptyStateMessage="No clinical cases created by supervisors in this hub yet"
      />

      <ClinicalLeadCases clinicalLeadCases={allClinicalLeadCases} />
    </div>
  );
}
