import type { ImplementerRole } from "#/db/enums";
import { memo } from "react";
import type { FellowDialogKind } from "#/components/common/fellow/fellow-schools-columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import type { FellowsData } from "../../../app/(platform)/sc/actions";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

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
      <RowActionsTrigger label={`Actions for ${fellowRow.fellowName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
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
