import { clinicalSessionsDataBreakdown } from "#/app/(platform)/ct/students/actions";
import ClinicalStats from "#/app/(platform)/ct/students/components/clinical-stats";
import ClinicalStatsLoader from "#/app/(platform)/ct/students/components/clinnical-stats-loader";
import { Suspense } from "react";

export default async function ClinicalStatsWrapper() {
  const clinicalData = await clinicalSessionsDataBreakdown();
  return (
    <Suspense fallback={<ClinicalStatsLoader />}>
      <ClinicalStats clinicalData={clinicalData} />
    </Suspense>
  );
}
