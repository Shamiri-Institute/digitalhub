import { Suspense } from "react";
import { getOverallStudentsDataBreakdown } from "#/app/(platform)/ct/students/actions";
import OverallStudentsClinicalStats from "./overall-stats";
import OverallStatsLoader from "./overall-stats-loader";

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
