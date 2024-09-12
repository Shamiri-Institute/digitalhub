import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import type { FellowsData } from "../../actions";
import SubmitWeeklyFellowEvaluationForm from "./add-weekly-fellow-evaluations-form";

export default function FellowsTableDropdownMenu({
  fellowRow,
}: {
  fellowRow: FellowsData;
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
        <DropdownMenuItem>Edit fellow information</DropdownMenuItem>
        <DropdownMenuItem>Session Attendance History</DropdownMenuItem>
        <DropdownMenuItem>Request repayment</DropdownMenuItem>
        <SubmitWeeklyFellowEvaluationForm
          previousRatings={fellowRow.weeklyFellowRatings}
          fellowId={fellowRow.id}
          fellowName={fellowRow.fellowName ?? "N/A"}
          fellowPhoneNumber={fellowRow.mpesaNumber ?? "N/A"}
        >
          {/* TODO: find a solution to allow easy interop with the DropdownMenuItemComponent */}
          <div className={cn("cursor-pointer px-2 py-1.5 text-sm")}>
            Weekly Fellow Evaluation
          </div>
        </SubmitWeeklyFellowEvaluationForm>
        <DropdownMenuItem>Submit Complaint</DropdownMenuItem>
        {!fellowRow.droppedOut || !fellowRow.droppedOutAt ? (
          <DropdownMenuItem className="text-shamiri-red">
            Drop out fellow
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="text-shamiri-red">
            Undo dropout
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
