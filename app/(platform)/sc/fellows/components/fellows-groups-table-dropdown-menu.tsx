import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Dispatch, SetStateAction } from "react";
import type { FellowsData } from "../../actions";

export type FellowGroupData = FellowsData["groups"][number];

export default function FellowsGroupsTableDropdownMenu({
  group,
  state,
}: {
  group?: FellowGroupData;
  state: {
    setFellowGroup: Dispatch<
      SetStateAction<FellowsData["groups"][number] | undefined>
    >;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
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
        {/*<StudentsInGroupTable*/}
        {/*  students={sessionRow?.students ?? []}*/}
        {/*  groupName={sessionRow?.groupName ?? "N/A"}*/}
        {/*>*/}
        {/*  <div*/}
        {/*    className={cn(*/}
        {/*      "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",*/}
        {/*    )}*/}
        {/*  >*/}
        {/*    View Students*/}
        {/*  </div>*/}
        {/*</StudentsInGroupTable>*/}
        <DropdownMenuItem
          onClick={() => {
            state.setFellowGroup(group);
            state.setAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFellowGroup(group);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem>Weekly group evaluation</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
