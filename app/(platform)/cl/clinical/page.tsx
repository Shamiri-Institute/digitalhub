import {
  getClinicalCasesData,
  getClinicalCasesInHub,
  getSchoolsInClinicalLeadHub,
} from "#/app/(platform)/cl/clinical/actions";
import CasesBreakdown from "#/app/(platform)/cl/clinical/components/cases-breakdown";
import AllHubClinicalCasesTable from "#/app/(platform)/cl/clinical/components/hub-clinical-cases-table";
import { AddNewClinicalCaseForm } from "#/components/common/clinical/add-new-clinical-case-form";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { Plus } from "lucide-react";

export default async function ClinicalPage() {
  const cases = await getClinicalCasesInHub();
  const casesData = await getClinicalCasesData();
  const { schools, fellowsInHub, supervisorsInHub, currentClinicalLeadId } =
    await getSchoolsInClinicalLeadHub();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddNewClinicalCaseForm
          schools={schools}
          fellowsInHub={fellowsInHub}
          supervisorsInHub={supervisorsInHub}
          creatorId={currentClinicalLeadId}
          role="CLINICAL_LEAD"
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
        role="CLINICAL_LEAD"
        currentClinicalLeadId={currentClinicalLeadId}
      />
    </div>
  );
}
