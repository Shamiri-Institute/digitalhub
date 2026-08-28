import { type ComponentProps, Suspense } from "react";
import StudentsStatsBreakdown from "#/components/common/clinical/students-stats";
import StudentsStatsLoader from "#/components/common/clinical/students-stats-loader";

export default async function StudentsStatsWrapper({
  getData,
}: {
  getData: () => Promise<ComponentProps<typeof StudentsStatsBreakdown>["studentsStats"]>;
}) {
  const studentsStats = await getData();
  return (
    <Suspense fallback={<StudentsStatsLoader />}>
      <StudentsStatsBreakdown studentsStats={studentsStats} />
    </Suspense>
  );
}
