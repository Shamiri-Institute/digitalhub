import { getClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import CasesBreakdown from "#/app/(platform)/cl/clinical/components/cases-breakdown";
import AllHubClinicalCasesTable from "#/app/(platform)/cl/clinical/components/hub-clinical-cases-table";

export default async function ClinicalPage() {
  const cases = await getClinicalCases();
  return (
    <div>
      <CasesBreakdown />
      <AllHubClinicalCasesTable cases={cases} />
    </div>
  );
}
