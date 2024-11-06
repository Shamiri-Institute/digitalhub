import { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/supervisors/actions";
import HCApproveSupervisorExpense from "#/app/(platform)/hc/reporting/supervisors/components/approve-expense";
import HCDeleteExpenseRequest from "#/app/(platform)/hc/reporting/supervisors/components/delete-expense-request";
import HCEditSupervisorExpense from "#/app/(platform)/hc/reporting/supervisors/components/edit-expense";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function HCSupervisorExpenseDropdownMenu({
  expense,
}: {
  expense: HubSupervisorExpensesType;
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
        {expense.status !== "APPROVED" && (
          <HCApproveSupervisorExpense expense={expense}>
            <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
              Approve
            </div>
          </HCApproveSupervisorExpense>
        )}
        <HCEditSupervisorExpense expense={expense}>
          <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
            Edit Request
          </div>
        </HCEditSupervisorExpense>

        <div className="cursor-pointer px-2 py-1.5 text-sm text-shamiri-black">
          Download receipt(s)
        </div>
        <DropdownMenuSeparator />

        <HCDeleteExpenseRequest expense={expense}>
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-red",
            )}
          >
            Delete request
          </div>
        </HCDeleteExpenseRequest>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
