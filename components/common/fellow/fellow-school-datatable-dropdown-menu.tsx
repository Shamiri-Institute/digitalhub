import type { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { memo } from "react";
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
  group?: FellowGroupData;
  state: {
    setFellowGroup: Dispatch<SetStateAction<FellowsData["groups"][number] | undefined>>;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
    role: ImplementerRole;
  };
}) {
  console.log(
    `[FellowSchoolDatatableDropdownMenu] RENDER - groupId: ${group?.id ?? "none"}, groupName: ${group?.groupName ?? "none"}`,
  );

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
              console.log("[FellowSchoolDatatableDropdownMenu] CLICKED: Mark attendance");
              state.setFellowGroup(group);
              state.setAttendanceDialog(true);
              console.log(
                "[FellowSchoolDatatableDropdownMenu] STATE: attendanceDialog set to true",
              );
            }}
          >
            Mark attendance
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            console.log("[FellowSchoolDatatableDropdownMenu] CLICKED: View students in group");
            state.setFellowGroup(group);
            state.setStudentsDialog(true);
            console.log("[FellowSchoolDatatableDropdownMenu] STATE: studentsDialog set to true");
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            console.log("[FellowSchoolDatatableDropdownMenu] CLICKED: Weekly group evaluation");
            state.setFellowGroup(group);
            state.setEvaluationDialog(true);
            console.log("[FellowSchoolDatatableDropdownMenu] STATE: evaluationDialog set to true");
          }}
        >
          Weekly group evaluation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default FellowSchoolDatatableDropdownMenu;
