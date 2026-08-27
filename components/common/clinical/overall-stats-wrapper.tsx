import { type ComponentProps, Suspense } from "react";
import OverallStudentsClinicalStats from "#/components/common/clinical/overall-stats";
import OverallStatsLoader from "#/components/common/clinical/overall-stats-loader";

export default async function OverallStatsWrapper({
  getData,
}: {
  getData: () => Promise<ComponentProps<typeof OverallStudentsClinicalStats>>;
}) {
  const { totalStudents, groupSessions, clinicalCases, clinicalSessions } = await getData();
  return (
    <Suspense fallback={<OverallStatsLoader />}>
      <OverallStudentsClinicalStats
        totalStudents={totalStudents}
        groupSessions={groupSessions}
        clinicalCases={clinicalCases}
        clinicalSessions={clinicalSessions}
      />
    </Suspense>
  );
}
