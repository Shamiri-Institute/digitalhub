import { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import ViewEditFellowComplaints from "#/components/common/fellow-reports/complaints/view-edit-complaints";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export default function FellowComplaintsDropdownMenu({
  fellowComplaints,
}: {
  fellowComplaints: FellowComplaintsType["complaints"][number];
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
        <ViewEditFellowComplaints
          fellowComplaints={fellowComplaints}
          action="view"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            View fellow complaint
          </div>
        </ViewEditFellowComplaints>
        <ViewEditFellowComplaints
          fellowComplaints={fellowComplaints}
          action="edit"
        >
          <div
            className={cn(
              "cursor-pointer px-2 py-1.5 text-sm text-shamiri-black",
            )}
          >
            Edit fellow complaint
          </div>
        </ViewEditFellowComplaints>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
