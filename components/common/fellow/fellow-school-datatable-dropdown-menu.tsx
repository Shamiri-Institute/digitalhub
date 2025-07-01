import type { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
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

export default function FellowSchoolDatatableDropdownMenu({
  group,
  state,
}: {
  group?: FellowGroupData;
  state: {
    setFellowGroup: Dispatch<SetStateAction<FellowsData["groups"][number] | undefined>>;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
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
          <DropdownMenuItem
            onClick={() => {
              state.setFellowGroup(group);
              state.setAttendanceDialog(true);
            }}
          >
            Mark attendance
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            state.setFellowGroup(group);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFellowGroup(group);
            state.setEvaluationDialog(true);
          }}
        >
          Weekly group evaluation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
