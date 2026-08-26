import type { SchoolFeedbackType } from "#/app/(platform)/sc/reporting/school-reports/school-feedback/action";
import ReportActionsDropdown from "#/components/common/report-actions-dropdown";
import ViewEditSchoolFeedback from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";

export default function SchoolFeedbackDropdownMenu({
  feedback,
}: {
  feedback: SchoolFeedbackType["supervisorRatings"][number];
}) {
  return (
    <ReportActionsDropdown
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
