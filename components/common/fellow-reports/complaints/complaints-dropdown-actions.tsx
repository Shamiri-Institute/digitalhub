import type { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import ViewEditFellowComplaints from "#/components/common/fellow-reports/complaints/view-edit-complaints";
import ViewEditReportDropdown from "#/components/common/view-edit-report-dropdown";

export default function FellowComplaintsDropdownMenu({
  fellowComplaints,
}: {
  fellowComplaints: FellowComplaintsType["complaints"][number];
}) {
  return (
    <ViewEditReportDropdown
      triggerLabel={`Actions for the complaint of ${fellowComplaints.date}`}
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
