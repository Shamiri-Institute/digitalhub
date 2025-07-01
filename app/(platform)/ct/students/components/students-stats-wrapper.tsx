import { Suspense } from "react";
import { getStudentsStatsBreakdown } from "#/app/(platform)/ct/students/actions";
import StudentsStatsBreakdown from "#/app/(platform)/ct/students/components/students-stats";
import StudentsStatsLoader from "#/app/(platform)/ct/students/components/students-stats-loader";

export default async function StudentsStatsWrapper() {
  const studentsStats = await getStudentsStatsBreakdown();
  return (
    <Suspense fallback={<StudentsStatsLoader />}>
      <StudentsStatsBreakdown studentsStats={studentsStats} />
    </Suspense>
  );
}
