import type { ImplementerRole } from "#/db/enums";
import { memo } from "react";
import type { FellowDialogKind } from "#/components/common/fellow/fellow-schools-columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import type { FellowsData } from "../../../app/(platform)/sc/actions";

const FellowSchoolsDatatableDropdownMenu = memo(function FellowSchoolsDatatableDropdownMenu({
  fellowRow,
  state,
}: {
  fellowRow: FellowsData;
  state: {
    openDialog: (kind: FellowDialogKind, fellow: FellowsData) => void;
    openEditDialog: (fellow: FellowsData) => void;
    role: ImplementerRole;
  };
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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {state.role === "SUPERVISOR" ? (
          <DropdownMenuItem onClick={() => state.openEditDialog(fellowRow)}>
            Edit fellow information
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => state.openDialog("attendanceHistory", fellowRow)}>
          Session attendance history
        </DropdownMenuItem>
        {state.role === "SUPERVISOR" ? (
          <>
            <DropdownMenuItem onClick={() => state.openDialog("weeklyEvaluation", fellowRow)}>
              Submit weekly fellow evaluation
            </DropdownMenuItem>
            <DropdownMenuItem>Request repayment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => state.openDialog("complaints", fellowRow)}>
              Submit Complaint
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default FellowSchoolsDatatableDropdownMenu;
