import { signOut } from "next-auth/react";
import {
  getClinicalCases,
  getReferredCasesToSupervisor,
  getSchoolsInHub,
} from "#/app/(platform)/sc/clinical/action";
import ClinicalCasesStats from "#/app/(platform)/sc/clinical/components/cases-stats";
import ClinicalCasesTable from "#/app/(platform)/sc/clinical/components/clinical-cases-table";
import { CasesReferredToMe } from "#/components/common/clinical/cases-referred-to-me";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";

export default async function ClinicalPage() {
  const cases = await getClinicalCases();
  const { schools, fellowsInProject, supervisorsInHub, currentSupervisorId, hubs } =
    await getSchoolsInHub();

  if (!currentSupervisorId) {
    await signOut({ callbackUrl: "/login" });
  }

  const referredCases = await getReferredCasesToSupervisor();

  return (
    <div className="w-full self-stretch">
      <div className="flex h-full flex-col">
        <div className="container w-full grow space-y-4 py-10">
          <div className="flex flex-col items-center justify-between space-y-3">
            <ClinicalCasesStats />
            <Separator />
            <CasesReferredToMe cases={referredCases} currentSupervisorId={currentSupervisorId!} />
            <ClinicalCasesTable
              cases={cases}
              schools={schools}
              fellowsInProject={fellowsInProject}
              supervisorsInHub={supervisorsInHub}
              currentSupervisorId={currentSupervisorId!}
              hubs={hubs}
            />
          </div>
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
1;
