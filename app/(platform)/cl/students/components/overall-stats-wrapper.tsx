import { Suspense } from "react";
import { getOverallStudentsDataBreakdown } from "#/app/(platform)/cl/students/actions";
import OverallStudentsClinicalStats from "#/components/common/clinical/overall-stats";
import OverallStatsLoader from "#/components/common/clinical/overall-stats-loader";

export default async function OverallStatsWrapper() {
  const { totalStudents, groupSessions, clinicalCases, clinicalSessions } =
    await getOverallStudentsDataBreakdown();
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
