import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

export function GroupsDatatableMenu({
  group,
  state,
}: {
  group: SchoolGroupDataTableData;
  state: {
    setGroup: Dispatch<SetStateAction<SchoolGroupDataTableData | undefined>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setLeaderDialog: Dispatch<SetStateAction<boolean>>;
    setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
    setArchiveDialog: Dispatch<SetStateAction<boolean>>;
    setUnarchiveDialog: Dispatch<SetStateAction<boolean>>;
    role: ImplementerRole;
  };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="text-shamiri-text-grey h-5 w-5" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-shamiri-text-grey text-xs font-medium uppercase">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(state.role === ImplementerRole.HUB_COORDINATOR ||
          state.role === ImplementerRole.SUPERVISOR) && (
          <DropdownMenuItem
            onClick={() => {
              state.setGroup(group);
              state.setLeaderDialog(true);
            }}
          >
            Replace fellow
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            state.setGroup(group);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setGroup(group);
            state.setEvaluationDialog(true);
          }}
        >
          View student group evaluation
        </DropdownMenuItem>
        {(state.role === ImplementerRole.HUB_COORDINATOR ||
          state.role === ImplementerRole.SUPERVISOR) &&
          !group.archivedAt && (
            <DropdownMenuItem
              className="text-shamiri-red"
              onClick={() => {
                state.setGroup(group);
                state.setArchiveDialog(true);
              }}
            >
              Archive group
            </DropdownMenuItem>
          )}
        {state.role === ImplementerRole.HUB_COORDINATOR && group.archivedAt && (
          <DropdownMenuItem
            className="text-shamiri-red"
            onClick={() => {
              state.setGroup(group);
              state.setUnarchiveDialog(true);
            }}
          >
            Unarchive group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
