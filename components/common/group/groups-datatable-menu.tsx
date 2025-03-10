import { SchoolGroupDataTableData } from "#/components/common/group/columns";
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
import { Dispatch, SetStateAction } from "react";

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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {state.role !== "FELLOW" && (
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
        {state.role !== "FELLOW" && (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
