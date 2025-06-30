import type { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import ApproveRejectFellowComplaint from "#/components/common/expenses/complaints/approve-reject-complaint";
import ViewFellowComplaint from "#/components/common/expenses/complaints/view-complaint";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export type ComplaintData = HubReportComplaintsType["complaints"][number];

export default async function FellowComplaintsActionsDropdown({
  complaint,
}: {
  complaint: ComplaintData;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {complaint.status !== "PENDING" ? (
          <ViewFellowComplaint complaint={complaint}>
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              View complaint
            </div>
          </ViewFellowComplaint>
        ) : (
          <ApproveRejectFellowComplaint
            complaint={complaint}
            fellows={complaint.allFellowsInHub ?? []}
          >
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              Approve/reject complaint
            </div>
          </ApproveRejectFellowComplaint>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
