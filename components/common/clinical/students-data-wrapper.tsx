import { type ComponentProps, Suspense } from "react";
import StudentsDataBreakdown from "#/components/common/clinical/students-data-breakdown";
import StudentsDataLoader from "#/components/common/clinical/students-data-loader";

export default async function StudentsDataWrapper({
  getData,
}: {
  getData: () => Promise<ComponentProps<typeof StudentsDataBreakdown>>;
}) {
  const studentData = await getData();
  return (
    <Suspense fallback={<StudentsDataLoader />}>
      <StudentsDataBreakdown {...studentData} />
    </Suspense>
  );
}
