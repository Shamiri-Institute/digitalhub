import {
  getClinicalCases,
  getClinicalCasesData,
} from "#/app/(platform)/cl/clinical/actions";
import CasesBreakdown from "#/app/(platform)/cl/clinical/components/cases-breakdown";
import AllHubClinicalCasesTable from "#/app/(platform)/cl/clinical/components/hub-clinical-cases-table";

export default async function ClinicalPage() {
  const cases = await getClinicalCases();
  const casesData = await getClinicalCasesData();
  return (
    <div>
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
