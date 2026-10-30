import { ImplementerRole } from "#/db/enums";
import type { GroupTableState, SchoolGroupDataTableData } from "#/components/common/group/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export function GroupsDatatableMenu({
  group,
  state,
}: {
  group: SchoolGroupDataTableData;
  state: GroupTableState;
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
          <DropdownMenuItem onClick={() => state.openDialog("replaceLeader", group)}>
            Replace fellow
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => state.openDialog("students", group)}>
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => state.openDialog("evaluation", group)}>
          View student group evaluation
        </DropdownMenuItem>
        {(state.role === ImplementerRole.HUB_COORDINATOR ||
          state.role === ImplementerRole.SUPERVISOR) &&
          !group.archivedAt && (
            <DropdownMenuItem
              className="text-shamiri-red"
              onClick={() => state.openDialog("archive", group)}
            >
              Archive group
            </DropdownMenuItem>
          )}
        {state.role === ImplementerRole.HUB_COORDINATOR && group.archivedAt && (
          <DropdownMenuItem
            className="text-shamiri-red"
            onClick={() => state.openDialog("unarchive", group)}
          >
            Unarchive group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
