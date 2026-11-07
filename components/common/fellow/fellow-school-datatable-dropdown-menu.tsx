import type { ImplementerRole } from "#/db/enums";
import { memo } from "react";
import type { FellowGroupDialogKind } from "#/components/common/fellow/fellow-schools-columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import type { FellowsData } from "../../../app/(platform)/sc/actions";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export type FellowGroupData = FellowsData["groups"][number];

const FellowSchoolDatatableDropdownMenu = memo(function FellowSchoolDatatableDropdownMenu({
  group,
  state,
}: {
  group: FellowGroupData;
  state: {
    openDialog: (kind: FellowGroupDialogKind, group: FellowGroupData) => void;
    role: ImplementerRole;
  };
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${group.groupName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {state.role === "SUPERVISOR" ? (
          <DropdownMenuItem onClick={() => state.openDialog("markAttendance", group)}>
            Mark attendance
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => state.openDialog("students", group)}>
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => state.openDialog("groupEvaluation", group)}>
          Weekly group evaluation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default FellowSchoolDatatableDropdownMenu;
