import { Suspense } from "react";
import { getStudentsDataBreakdown } from "#/app/(platform)/ct/students/actions";
import StudentsDataBreakdown from "#/app/(platform)/ct/students/components/students-data-breakdown";
import StudentsDataLoader from "#/app/(platform)/ct/students/components/students-data-loader";

export default async function StudentsDataWrapper() {
  const studentData = await getStudentsDataBreakdown();
  return (
    <Suspense fallback={<StudentsDataLoader />}>
      <StudentsDataBreakdown {...studentData} />
    </Suspense>
  );
}
