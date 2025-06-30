import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
import type { ImplementerRole } from "@prisma/client";
import Link from "next/link";
import { useContext } from "react";

export default function SchoolTableDropdown({
  schoolRow,
  role,
}: {
  schoolRow: SchoolsTableData;
  role: ImplementerRole;
}) {
  const context = useContext(SchoolInfoContext);
  return (
    <DropdownMenu
      onOpenChange={(value) => {
        if (value) {
          context.setSchool(schoolRow);
        }
      }}
    >
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
                    context.setEditDialog(true);
                  }}
                >
                  Edit school information
                </DropdownMenuItem>
                {role === "HUB_COORDINATOR" && (
                  <DropdownMenuItem
                    onClick={() => {
                      context.setPointSupervisorDialog(true);
                    }}
                  >
                    {context.school?.assignedSupervisorId !== null
                      ? "Change point supervisor"
                      : "Assign point supervisor"}
                  </DropdownMenuItem>
                )}
                {role === "SUPERVISOR" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        // context.setPointSupervisorDialog(true);
                      }}
                    >
                      Submit school report
                    </DropdownMenuItem>
                    <DropdownMenuItem
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
                    context.setSchoolDropOutDialog(true);
                  }}
                >
                  Dropout school
                </DropdownMenuItem>
              </div>
            ) : (
              <DropdownMenuItem
                className="text-shamiri-red"
                onClick={() => {
                  context.setUndoDropOutDialog(true);
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
