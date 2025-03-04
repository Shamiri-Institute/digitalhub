import {
  getClinicalCases,
  getSchoolsInHub,
} from "#/app/(platform)/sc/clinical/action";
import ClinicalCasesStats from "#/app/(platform)/sc/clinical/components/cases-stats";
import ClinicalCasesTable from "#/app/(platform)/sc/clinical/components/clinical-cases-table";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { signOut } from "next-auth/react";

export default async function ClinicalPage() {
  const cases = await getClinicalCases();
  const { schools, fellowsInHub, supervisorsInHub, currentSupervisorId } =
    await getSchoolsInHub();

  if (!currentSupervisorId) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="w-full self-stretch">
      <div className="flex h-full flex-col">
        <div className="container w-full grow space-y-4 py-10">
          <div className="flex flex-col items-center justify-between space-y-3">
            <ClinicalCasesStats />
            <Separator />
            <ClinicalCasesTable
              cases={cases}
              schools={schools}
              fellowsInHub={fellowsInHub}
              supervisorsInHub={supervisorsInHub}
              currentSupervisorId={currentSupervisorId!}
            />
          </div>
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
1;
