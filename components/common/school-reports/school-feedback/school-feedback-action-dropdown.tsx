import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import ViewEditSchoolFeedback from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import ViewEditReportDropdown from "#/components/common/view-edit-report-dropdown";

export default function SchoolFeedbackDropdownMenu({
  feedback,
}: {
  feedback: SchoolFeedbackType["supervisorRatings"][number];
}) {
  return (
    <ViewEditReportDropdown
      viewLabel="View school feedback"
      editLabel="Edit school feedback"
      renderDialog={(action, children) => (
        <ViewEditSchoolFeedback feedback={feedback} action={action}>
          {children}
        </ViewEditSchoolFeedback>
      )}
    />
  );
}
