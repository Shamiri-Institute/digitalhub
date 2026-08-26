import type { SessionReportType } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import ReportActionsDropdown from "#/components/common/report-actions-dropdown";
import ViewEditQualitativeFeedback from "#/components/common/school-reports/session/view-edit-qualitative-feedback";

export default function SessionDropdownMenu({
  sessionReportData,
}: {
  sessionReportData: SessionReportType["session"][number];
}) {
  return (
    <ReportActionsDropdown
      viewLabel="View qualitative feedback"
      editLabel="Edit school report"
      renderDialog={(action, children) => (
        <ViewEditQualitativeFeedback sessionReport={sessionReportData} action={action}>
          {children}
        </ViewEditQualitativeFeedback>
      )}
    />
  );
}
