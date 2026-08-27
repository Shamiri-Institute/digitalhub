import { Suspense } from "react";
import { clinicalSessionsDataBreakdown } from "#/app/(platform)/ct/students/actions";
import ClinicalStats from "#/components/common/clinical/clinical-stats";
import ClinicalStatsLoader from "#/components/common/clinical/clinical-stats-loader";

export default async function ClinicalStatsWrapper() {
  const clinicalData = await clinicalSessionsDataBreakdown();
  return (
    <Suspense fallback={<ClinicalStatsLoader />}>
      <ClinicalStats clinicalData={clinicalData} />
    </Suspense>
  );
}
