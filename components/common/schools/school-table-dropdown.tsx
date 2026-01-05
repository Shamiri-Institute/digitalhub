import type { ImplementerRole } from "@prisma/client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type { SchoolsTableData } from "#/components/common/schools/columns";
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
  state: {
    editDialog: boolean;
    setEditDialog: Dispatch<SetStateAction<boolean>>;
    pointSupervisorDialog: boolean;
    setPointSupervisorDialog: Dispatch<SetStateAction<boolean>>;
    schoolDropOutDialog: boolean;
    setSchoolDropOutDialog: Dispatch<SetStateAction<boolean>>;
    undoDropOutDialog: boolean;
    setUndoDropOutDialog: Dispatch<SetStateAction<boolean>>;
    school: SchoolsTableData | null;
    setSchool: Dispatch<SetStateAction<SchoolsTableData | null>>;
  };
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
        {role === "HUB_COORDINATOR" || role === "SUPERVISOR" ? (
          <>
            {!schoolRow.droppedOut || !schoolRow.droppedOutAt ? (
              <div>
                <DropdownMenuItem
                  onClick={() => {
                    state.setSchool(schoolRow);
                    state.setEditDialog(true);
                  }}
                >
                  Edit school information
                </DropdownMenuItem>
                {role === "HUB_COORDINATOR" && (
                  <DropdownMenuItem
                    onClick={() => {
                      state.setSchool(schoolRow);
                      state.setPointSupervisorDialog(true);
                    }}
                  >
                    {state.school?.assignedSupervisorId !== null
                      ? "Change point supervisor"
                      : "Assign point supervisor"}
                  </DropdownMenuItem>
                )}
                {role === "SUPERVISOR" && (
                  <>
                    <DropdownMenuItem
                      disabled={true}
                      onClick={() => {
                        // context.setPointSupervisorDialog(true);
                      }}
                    >
                      Submit school report
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={true}
                      onClick={() => {
                        // context.setPointSupervisorDialog(true);
                      }}
                    >
                      Submit school feedback
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  className="text-shamiri-red"
                  onClick={() => {
                    state.setSchool(schoolRow);
                    state.setSchoolDropOutDialog(true);
                  }}
                >
                  Dropout school
                </DropdownMenuItem>
              </div>
            ) : (
              <DropdownMenuItem
                className="text-shamiri-red"
                onClick={() => {
                  state.setSchool(schoolRow);
                  state.setUndoDropOutDialog(true);
                }}
              >
                Undo dropout
              </DropdownMenuItem>
            )}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
