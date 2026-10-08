import type { SessionReportType } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import ViewEditQualitativeFeedback from "#/components/common/school-reports/session/view-edit-qualitative-feedback";
import ViewEditReportDropdown from "#/components/common/view-edit-report-dropdown";

export default function SessionDropdownMenu({
  sessionReportData,
  canAddNotes,
}: {
  sessionReportData: SessionReportType["session"][number];
  canAddNotes: boolean;
}) {
  return (
    <ViewEditReportDropdown
      viewLabel="View qualitative feedback"
      editLabel="Edit school report"
      renderDialog={(action, children) => (
        <ViewEditQualitativeFeedback
          sessionReport={sessionReportData}
          action={action}
          canAddNotes={canAddNotes}
        >
          {children}
        </ViewEditQualitativeFeedback>
      )}
    />
  );
}
