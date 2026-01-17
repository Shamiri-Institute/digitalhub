import { Suspense } from "react";
import ClinicalCasesStats from "#/app/(platform)/sc/clinical/components/cases-stats";
import ClinicalStatsLoader from "#/app/(platform)/sc/clinical/components/clinical-stats-loader";
import ClinicalTableLoader from "#/app/(platform)/sc/clinical/components/clinical-table-loader";
import ClinicalTableSection from "#/app/(platform)/sc/clinical/components/clinical-table-section";
import ReferredCasesLoader from "#/app/(platform)/sc/clinical/components/referred-cases-loader";
import ReferredCasesSection from "#/app/(platform)/sc/clinical/components/referred-cases-section";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";

export default function ClinicalPage() {
  return (
    <div className="w-full self-stretch">
      <div className="flex h-full flex-col">
        <div className="container w-full grow space-y-4 py-10">
          <div className="flex flex-col items-center justify-between space-y-3">
            <Suspense fallback={<ClinicalStatsLoader />}>
              <ClinicalCasesStats />
            </Suspense>
            <Separator />
            <Suspense fallback={<ReferredCasesLoader />}>
              <ReferredCasesSection />
            </Suspense>
            <Suspense fallback={<ClinicalTableLoader />}>
              <ClinicalTableSection />
            </Suspense>
          </div>
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
