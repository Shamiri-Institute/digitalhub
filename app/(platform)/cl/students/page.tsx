import ClinicalStatsWrapper from "#/app/(platform)/cl/students/components/clinical-stats-wrapper";
import OverallStatsWrapper from "#/app/(platform)/cl/students/components/overall-stats-wrapper";
import StudentsDataWrapper from "#/app/(platform)/cl/students/components/students-data-wrapper";
import StudentsStatsWrapper from "#/app/(platform)/cl/students/components/students-stats-wrapper";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function StudentsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <PageHeading title="Students" />
        <Separator />
        <OverallStatsWrapper />
        <StudentsDataWrapper />
        <ClinicalStatsWrapper />
        <StudentsStatsWrapper />
      </div>
    </div>
  );
}
