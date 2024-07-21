import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import Link from "next/link";
import { useContext } from "react";

export default function SchoolTableDropdown({
  schoolRow,
}: {
  schoolRow: SchoolsTableData;
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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/hc/schools/${schoolRow.visibleId}`}>View school</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            context.setEditDialog(true);
          }}
        >
          Edit school information
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            context.setPointSupervisorDialog(true);
          }}
        >
          {context.school?.assignedSupervisorId !== null
            ? "Change point supervisor"
            : "Assign point supervisor"}
        </DropdownMenuItem>
        {!schoolRow.droppedOut || !schoolRow.droppedOutAt ? (
          <DropdownMenuItem
            className="text-shamiri-red"
            onClick={() => {
              context.setSchoolDropOutDialog(true);
            }}
          >
            Dropout school
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
