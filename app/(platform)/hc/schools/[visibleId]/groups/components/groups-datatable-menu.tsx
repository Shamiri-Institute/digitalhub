import { SchoolGroupDataTableData } from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
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

export function GroupsDatatableMenu({
  group,
  state,
}: {
  group: SchoolGroupDataTableData;
  state: {
    setGroup: Dispatch<SetStateAction<SchoolGroupDataTableData | undefined>>;
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
        <DropdownMenuItem>View students in group</DropdownMenuItem>
        <DropdownMenuItem>View student group evaluation</DropdownMenuItem>
        <DropdownMenuItem className="text-shamiri-red">
          Archive group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
