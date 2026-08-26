import type { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import ViewEditFellowComplaints from "#/components/common/fellow-reports/complaints/view-edit-complaints";
import ReportActionsDropdown from "#/components/common/report-actions-dropdown";

export default function FellowComplaintsDropdownMenu({
  fellowComplaints,
}: {
  fellowComplaints: FellowComplaintsType["complaints"][number];
}) {
  return (
    <ReportActionsDropdown
      viewLabel="View fellow complaint"
      editLabel="Edit fellow complaint"
      renderDialog={(action, children) => (
        <ViewEditFellowComplaints fellowComplaints={fellowComplaints} action={action}>
          {children}
        </ViewEditFellowComplaints>
      )}
    />
  );
}
