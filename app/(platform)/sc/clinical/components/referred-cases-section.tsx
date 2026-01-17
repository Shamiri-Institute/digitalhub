import { getReferredCasesToSupervisor } from "#/app/(platform)/sc/clinical/action";
import { currentSupervisor } from "#/app/auth";
import { CasesReferredToMe } from "#/components/common/clinical/cases-referred-to-me";

export default async function ReferredCasesSection() {
  const [referredCases, supervisor] = await Promise.all([
    getReferredCasesToSupervisor(),
    currentSupervisor(),
  ]);

  return (
    <CasesReferredToMe cases={referredCases} currentSupervisorId={supervisor?.profile?.id ?? ""} />
  );
}
