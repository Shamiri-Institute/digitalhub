import { Suspense } from "react";
import { clinicalSessionsDataBreakdown } from "#/app/(platform)/cl/students/actions";
import ClinicalStats from "#/app/(platform)/cl/students/components/clinical-stats";
import ClinicalStatsLoader from "#/app/(platform)/cl/students/components/clinnical-stats-loader";

export default async function ClinicalStatsWrapper() {
  const clinicalData = await clinicalSessionsDataBreakdown();
  return (
    <Suspense fallback={<ClinicalStatsLoader />}>
      <ClinicalStats clinicalData={clinicalData} />
    </Suspense>
  );
}
