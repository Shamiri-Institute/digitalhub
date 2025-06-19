import {
  getAllClinicalCasesData,
  getClinicalCasesInHub,
} from "#/app/(platform)/ct/clinical/actions";
import CasesBreakdown from "#/app/(platform)/ct/clinical/components/cases-breakdown";
import AllHubClinicalCasesTable from "#/app/(platform)/ct/clinical/components/hub-clinical-cases-table";

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
      <AllHubClinicalCasesTable cases={cases} />
    </div>
  );
}
