import { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/complaints/actions";
import HCApproveRejectComplaint from "#/app/(platform)/hc/reporting/complaints/components/approve-reject-complaint";
import HCViewComplaint from "#/app/(platform)/hc/reporting/complaints/components/view-complaint";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export type ComplaintData = HubReportComplaintsType["complaints"][number];

export default async function HCComplaintsDropdownMenu({
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
          <HCViewComplaint complaint={complaint}>
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              View complaint
            </div>
          </HCViewComplaint>
        ) : (
          <HCApproveRejectComplaint
            complaint={complaint}
            fellows={complaint.allFellowsInHub ?? []}
          >
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              Approve/reject complaint
            </div>
          </HCApproveRejectComplaint>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
