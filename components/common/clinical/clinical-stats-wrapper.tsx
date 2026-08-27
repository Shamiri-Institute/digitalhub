import { type ComponentProps, Suspense } from "react";
import ClinicalStats from "#/components/common/clinical/clinical-stats";
import ClinicalStatsLoader from "#/components/common/clinical/clinical-stats-loader";

export default async function ClinicalStatsWrapper({
  getData,
}: {
  getData: () => Promise<ComponentProps<typeof ClinicalStats>["clinicalData"]>;
}) {
  const clinicalData = await getData();
  return (
    <Suspense fallback={<ClinicalStatsLoader />}>
      <ClinicalStats clinicalData={clinicalData} />
    </Suspense>
  );
}
