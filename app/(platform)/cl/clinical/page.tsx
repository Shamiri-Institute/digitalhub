import CasesBreakdown from "#/app/(platform)/cl/clinical/components/cases-breakdown";
import AllHubClinicalCasesTable from "#/app/(platform)/cl/clinical/components/hub-clinical-cases-table";

export default function ClinicalPage() {
  return (
      <div>
        <CasesBreakdown />
        <AllHubClinicalCasesTable />
      </div>
  );
}
