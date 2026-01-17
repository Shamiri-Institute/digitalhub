import { getClinicalCases, getSchoolsInHub } from "#/app/(platform)/sc/clinical/action";
import ClinicalCasesTable from "#/app/(platform)/sc/clinical/components/clinical-cases-table";

export default async function ClinicalTableSection() {
  const [cases, schoolsData] = await Promise.all([getClinicalCases(), getSchoolsInHub()]);

  const { schools, fellowsInProject, supervisorsInHub, currentSupervisorId, hubs } = schoolsData;

  return (
    <ClinicalCasesTable
      cases={cases}
      schools={schools}
      fellowsInProject={fellowsInProject}
      supervisorsInHub={supervisorsInHub}
      currentSupervisorId={currentSupervisorId ?? ""}
      hubs={hubs}
    />
  );
}
