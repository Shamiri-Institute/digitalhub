import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import { SupervisorFellowsAttendancesType } from "#/app/(platform)/sc/reporting/expenses/fellows/actions";
import ApproveSpecialSessionFellows from "#/components/common/expenses/fellows/approve-special-session";
import ConfirmReversalFellows from "#/components/common/expenses/fellows/confirm-reversal";
import RequestRepaymentFellows from "#/components/common/expenses/fellows/request-repayment";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export type FellowExpenseData =
  | HubFellowsAttendancesType["attendances"][number]
  | SupervisorFellowsAttendancesType["attendances"][number];

export default function FellowExpenseTableDropdown({
  expense,
}: {
  expense: FellowExpenseData;
}) {
  const isHub = "hub" in expense;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ConfirmReversalFellows expense={expense}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black ",
              !isHub && "pointer-events-none cursor-not-allowed opacity-50",
            )}
          >
            Reverse payment
          </div>
        </ConfirmReversalFellows>
        <RequestRepaymentFellows expense={expense}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
              !isHub && "pointer-events-none cursor-not-allowed opacity-50",
            )}
          >
            Request repayment
          </div>
        </RequestRepaymentFellows>
        <DropdownMenuSeparator />

        <ApproveSpecialSessionFellows expense={expense}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
              !isHub && "pointer-events-none cursor-not-allowed opacity-50",
            )}
          >
            Approve/reject special session
          </div>
        </ApproveSpecialSessionFellows>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
