import { ImplementerRole } from "#/db/enums";
import type {
  SchoolStudentTableData,
  StudentDialogKind,
} from "#/components/common/student/columns";
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
  state,
  student,
}: {
  state: {
    openDialog: (kind: StudentDialogKind, student: SchoolStudentTableData) => void;
    role: ImplementerRole;
  };
  student: SchoolStudentTableData;
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
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => state.openDialog("edit", student)}>
          {state.role === ImplementerRole.ADMIN ? "View information" : "Edit information"}
        </DropdownMenuItem>
        {state.role !== ImplementerRole.ADMIN && (
          <DropdownMenuItem onClick={() => state.openDialog("markAttendance", student)}>
            Mark student attendance
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => state.openDialog("groupTransferHistory", student)}>
          View group transfer history
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => state.openDialog("attendanceHistory", student)}>
          View attendance history
        </DropdownMenuItem>
        {state.role !== ImplementerRole.ADMIN && (
          <>
            <DropdownMenuItem onClick={() => state.openDialog("reportingNotes", student)}>
              Reporting notes
            </DropdownMenuItem>
            {state.role === ImplementerRole.HUB_COORDINATOR && (
              <>
                <DropdownMenuItem onClick={() => state.openDialog("moveSchool", student)}>
                  <div className="text-shamiri-red">Move to another school</div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => state.openDialog("archive", student)}>
                  <div className="text-shamiri-red">Archive student</div>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => state.openDialog("dropout", student)}>
              {student.droppedOut ? (
                <div className="text-shamiri-red">Undo drop out</div>
              ) : (
                <div className="text-shamiri-red">Drop-out student</div>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
