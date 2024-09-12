import { SchoolStudentTableData } from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export default function StudentsDataTableMenu({
  student,
}: {
  student: SchoolStudentTableData;
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
        <DropdownMenuItem>Edit information</DropdownMenuItem>
        <DropdownMenuItem>Mark student attendance</DropdownMenuItem>
        <DropdownMenuItem>View group transfer history</DropdownMenuItem>
        <DropdownMenuItem>View attendance history</DropdownMenuItem>
        <DropdownMenuItem>Add clinical case</DropdownMenuItem>
        <DropdownMenuItem>Reporting notes</DropdownMenuItem>
        <DropdownMenuItem>
          <div className="text-shamiri-red">Drop-out student</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
