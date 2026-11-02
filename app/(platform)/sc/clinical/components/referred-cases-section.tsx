import { getCasesReferredToMe } from "#/app/(platform)/sc/clinical/action";
import { CasesReferredToMe } from "#/components/common/clinical/cases-referred-to-me";

export default async function ReferredCasesSection() {
  const referredCases = await getCasesReferredToMe();

  return <CasesReferredToMe cases={referredCases} />;
}
