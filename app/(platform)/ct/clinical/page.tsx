import {
  getAllClinicalCasesData,
  getClinicalCasesInHub,
} from "#/app/(platform)/ct/clinical/actions";
import CasesBreakdown from "#/components/common/clinical/cases-breakdown";
import AllHubClinicalCasesTable from "#/components/common/clinical/hub-clinical-cases-table";

export default async function ClinicalPage() {
  const cases = await getClinicalCasesInHub();
  const casesData = await getAllClinicalCasesData();
  return (
    <div className="flex flex-col gap-4">
      <CasesBreakdown
        casesByStatus={casesData.casesByStatus}
        casesByRiskStatus={casesData.casesByRiskStatus}
        casesBySession={casesData.casesBySession}
        casesBySupervisor={casesData.casesBySupervisor}
      />
      <AllHubClinicalCasesTable
        cases={cases}
        title="All Clinical Cases"
        emptyStateMessage="No clinical cases created by supervisors or clinical leads yet"
      />
    </div>
  );
}
