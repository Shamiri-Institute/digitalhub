import type { ImplementerRole } from "#/db/enums";
import Link from "next/link";
import type { SchoolsTableData, SchoolTableState } from "#/components/common/schools/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export default function SchoolTableDropdown({
  schoolRow,
  role,
  state,
}: {
  schoolRow: SchoolsTableData;
  role: ImplementerRole;
  state: SchoolTableState;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l">
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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href={
              role === "HUB_COORDINATOR"
                ? `/hc/schools/${schoolRow.visibleId}/supervisors`
                : role === "SUPERVISOR"
                  ? `/sc/schools/${schoolRow.visibleId}/fellows`
                  : role === "FELLOW"
                    ? `/fel/schools/${schoolRow.visibleId}/group`
                    : role === "ADMIN"
                      ? `/admin/schools/${schoolRow.visibleId}/supervisors`
                      : "#"
            }
          >
            View school
          </Link>
        </DropdownMenuItem>
        {role === "HUB_COORDINATOR" &&
          (!schoolRow.droppedOut || !schoolRow.droppedOutAt ? (
            <div>
              <DropdownMenuItem onClick={() => state.openDialog("edit", schoolRow)}>
                Edit school information
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => state.openDialog("pointSupervisor", schoolRow)}>
                {schoolRow.assignedSupervisorId !== null
                  ? "Change point supervisor"
                  : "Assign point supervisor"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-shamiri-red"
                onClick={() => state.openDialog("dropout", schoolRow)}
              >
                Dropout school
              </DropdownMenuItem>
            </div>
          ) : (
            <DropdownMenuItem
              className="text-shamiri-red"
              onClick={() => state.openDialog("undoDropout", schoolRow)}
            >
              Undo dropout
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
