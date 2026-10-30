import type { ImplementerRole } from "#/db/enums";
import { memo } from "react";
import type { FellowGroupDialogKind } from "#/components/common/fellow/fellow-schools-columns";
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
