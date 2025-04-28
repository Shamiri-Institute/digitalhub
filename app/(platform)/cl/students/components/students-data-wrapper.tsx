import { getStudentsDataBreakdown } from "#/app/(platform)/cl/students/actions";
import StudentsDataBreakdown from "#/app/(platform)/cl/students/components/students-data-breakdown";
import StudentsDataLoader from "#/app/(platform)/cl/students/components/students-data-loader";
import { Suspense } from "react";

export default async function StudentsDataWrapper() {
  const studentData = await getStudentsDataBreakdown();
  return (
    <Suspense fallback={<StudentsDataLoader />}>
      <StudentsDataBreakdown {...studentData} />
    </Suspense>
  );
}
