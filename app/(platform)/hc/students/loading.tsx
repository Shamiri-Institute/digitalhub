import StudentsPageSkeleton from "#/components/charts/students-page-skeleton";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

// Laid out as page.tsx is, so the heading and card titles show at once.
export default function HubStudentLoadingPage() {
  return (
    <div className="container w-full grow space-y-3 py-10">
      <PageHeading title="Students" />
      <Separator />
      <StudentsPageSkeleton />
    </div>
  );
}
