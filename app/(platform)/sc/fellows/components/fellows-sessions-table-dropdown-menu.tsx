import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import type { FellowsData } from "../../actions";
import StudentsInGroupTable from "./students-in-group-table";

type FellowSessionsData = FellowsData["sessions"][number];

export default function FellowsSessionsTableDropdownMenu({
  sessionRow,
}: {
  sessionRow?: FellowSessionsData;
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
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <StudentsInGroupTable
          students={sessionRow?.students ?? []}
          groupName={sessionRow?.groupName ?? "N/A"}
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View Students
          </div>
        </StudentsInGroupTable>
        <DropdownMenuItem>Mark attendance</DropdownMenuItem>
        <DropdownMenuItem>Weekly Group Evaluation</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
