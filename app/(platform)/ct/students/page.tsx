import {
  clinicalSessionsDataBreakdown,
  getOverallStudentsDataBreakdown,
  getStudentsDataBreakdown,
  getStudentsStatsBreakdown,
} from "#/app/(platform)/ct/students/actions";
import ClinicalStatsWrapper from "#/components/common/clinical/clinical-stats-wrapper";
import OverallStatsWrapper from "#/components/common/clinical/overall-stats-wrapper";
import StudentsDataWrapper from "#/components/common/clinical/students-data-wrapper";
import StudentsStatsWrapper from "#/components/common/clinical/students-stats-wrapper";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function StudentsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <PageHeading title="Students" />
        <Separator />
        <OverallStatsWrapper getData={getOverallStudentsDataBreakdown} />
        <StudentsDataWrapper getData={getStudentsDataBreakdown} />
        <ClinicalStatsWrapper getData={clinicalSessionsDataBreakdown} />
        <StudentsStatsWrapper getData={getStudentsStatsBreakdown} />
      </div>
    </div>
  );
}
