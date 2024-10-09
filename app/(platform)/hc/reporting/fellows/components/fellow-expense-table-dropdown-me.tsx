import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/fellows/actions";
import HCApproveSpecialSession from "#/app/(platform)/hc/reporting/fellows/components/approve-special-session";
import HCConfirmReversal from "#/app/(platform)/hc/reporting/fellows/components/confirm-reversal";
import HCRequestRepayment from "#/app/(platform)/hc/reporting/fellows/components/request-repayment";
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
  HubFellowsAttendancesType["attendances"][number];

export default function HCFellowsExpenseDropdownMenu({
  expense,
}: {
  expense: FellowExpenseData;
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
        <HCConfirmReversal expense={expense ?? []}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Reverse payment
          </div>
        </HCConfirmReversal>
        <HCRequestRepayment expense={expense}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Request repayment
          </div>
        </HCRequestRepayment>
        <DropdownMenuSeparator />

        <HCApproveSpecialSession expense={expense ?? []}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Approve/reject special session
          </div>
        </HCApproveSpecialSession>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
