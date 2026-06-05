"use client";

import type { ImplementerRole, InterventionSession, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import type { Dispatch, SetStateAction } from "react";
import StudentsDataTableMenu from "#/components/common/student/students-datatable-menu";
import SessionHistoryWidget from "#/components/common/supervisor/sessions-history-widget";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { wrapColumnHeader } from "#/lib/utils";

export type SchoolStudentTableData = Prisma.StudentGetPayload<{
  include: {
    clinicalCases: {
      select: {
        id: true;
        _count: {
          select: { sessions: true };
        };
      };
    };
    studentAttendances: {
      include: {
        session: {
          include: {
            session: true;
          };
        };
        group: true;
      };
    };
    assignedGroup: {
      select: {
        id: true;
        groupName: true;
        leader: {
          select: {
            id: true;
            fellowName: true;
          };
        };
      };
    };
    school: {
      include: {
        interventionSessions: {
          include: {
            session: true;
          };
        };
      };
    };
    studentGroupTransferTrail: {
      select: {
        id: true;
        createdAt: true;
        updatedAt: true;
        studentId: true;
        currentGroupId: true;
        fromGroupId: true;
        fromGroup: {
          select: {
            id: true;
            groupName: true;
            leader: {
              select: {
                id: true;
                fellowName: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export const columns = (state: {
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
  setArchiveDialog: Dispatch<SetStateAction<boolean>>;
  setReportingNotesDialog: Dispatch<SetStateAction<boolean>>;
  setStudent: Dispatch<SetStateAction<SchoolStudentTableData | null>>;
  setGroupTransferHistory: Dispatch<SetStateAction<boolean>>;
  setMoveSchoolDialog: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  sessions: InterventionSession[];
}): ColumnDef<SchoolStudentTableData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "studentName",
    header: () => wrapColumnHeader("Student Name"),
    id: "Student Name",
  },
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "assignedGroup.groupName",
    header: () => wrapColumnHeader("Group Name"),
    id: "Group Name",
  },
  {
    header: () => wrapColumnHeader("Attendance history"),
    id: "Attendance history",
    cell: ({ row }) => {
      const attendances = state.sessions.map((session) => {
        const attendance = row.original.studentAttendances.find((x) => x.sessionId === session?.id);
        return {
          id: attendance?.id,
          attended: attendance?.attended ?? null,
          sessionId: attendance?.sessionId,
          absenceReason: attendance?.absenceReason ?? "",
          absenceComments: attendance?.comments ?? "",
          sessionType: session.sessionType ?? null,
          sessionOccurred: session.occurred,
          sessionDate: session.sessionDate,
        };
      });
      return <SessionHistoryWidget attendedSessions={attendances} />;
    },
  },
  {
    header: () => wrapColumnHeader("Shamiri ID"),
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  {
    accessorFn: (row) => row.yearOfBirth && `${new Date().getFullYear() - row.yearOfBirth} yrs`,
    header: "Age",
    id: "Age",
  },
  {
    header: () => wrapColumnHeader("Clinical Sessions"),
    id: "Clinical Sessions",
    accessorFn: (row) => row.clinicalCases?.reduce((acc, val) => acc + val._count.sessions, 0),
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    header: () => wrapColumnHeader("Contact no."),
    id: "Contact no.",
    accessorFn: (row) => {
      try {
        return row.phoneNumber && parsePhoneNumberWithError(row.phoneNumber, "KE").formatNational();
      } catch {
        return row.phoneNumber;
      }
    },
  },
  {
    header: () => wrapColumnHeader("Admission number"),
    id: "Admission number",
    accessorKey: "admissionNumber",
  },
  {
    header: "Questionnaire",
    id: "Questionnaire",
    accessorFn: (row) => row.questionnaireType ?? "None",
  },
  {
    header: "Stream",
    id: "Stream",
    accessorKey: "stream",
  },
  {
    header: "Grade/Form",
    id: "Grade/Form",
    accessorKey: "form",
  },
  {
    header: "Status",
    id: "Status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    header: () => wrapColumnHeader("Date added"),
    id: "Date added",
    accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
  },
  {
    id: "button",
    cell: ({ row }) => <StudentsDataTableMenu student={row.original} state={state} />,
    enableHiding: false,
  },
];
