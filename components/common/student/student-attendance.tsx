import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { SessionDetail } from "#/components/common/session/session-list";
import {
  Session,
  SessionsContext,
} from "#/components/common/session/sessions-provider";
import StudentAttendanceMenu from "#/components/common/student/student-attendance-menu";
import DataTable from "#/components/data-table";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { markStudentAttendance } from "#/lib/actions/student";
import { ImplementerRole, Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function StudentAttendance({
  isOpen,
  setIsOpen,
  role,
  session,
  fellows,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  session: Session | null;
  fellows: Prisma.FellowGetPayload<{}>[];
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [attendance, setAttendance] = useState<StudentAttendanceData>();
  const [markAttendanceDialog, setMarkAttendanceDialog] = useState(false);
  const [groups, setGroups] = useState<
    {
      fellow: Prisma.FellowGetPayload<{}>;
      group:
        | Prisma.InterventionGroupGetPayload<{
            include: {
              students: {
                include: {
                  _count: {
                    select: {
                      clinicalCases: true;
                    };
                  };
                  studentAttendances: true;
                };
              };
            };
          }>
        | undefined;
    }[]
  >([]);
  const { sessions, setSessions, refresh } = useContext(SessionsContext);

  const form = useForm<{ fellow: string }>({
    defaultValues: {
      fellow: undefined,
    },
  });

  useEffect(() => {
    const groups = fellows.map((fellow) => {
      const _session = sessions.find((x) => x.id === session?.id);
      const group = _session?.school?.interventionGroups.find(
        (group) => group.leaderId === fellow.id,
      );
      return { fellow, group };
    });

    setGroups(groups);
    setSessions(sessions);
  }, [fellows, session]);

  const markAttendance = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    const res = await markStudentAttendance(data);
    refresh();
    return res;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogContent className="w-3/4 max-w-none">
        <DialogHeader>
          <span className="text-xl font-bold">
            {role === "HUB_COORDINATOR"
              ? "View student attendance"
              : role === "SUPERVISOR"
                ? "Mark student attendance"
                : null}
          </span>
        </DialogHeader>
        {session && (
          <SessionDetail
            state={{ session }}
            layout={"compact"}
            withDropdown={false}
            role={role}
          />
        )}

        <div className="mb-4">
          <Form {...form}>
            <FormField
              control={form.control}
              name="fellow"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className={"text-sm"}>Select a fellow</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedGroup(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fellow" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group, index) => (
                        <SelectItem
                          key={group.group?.id ?? index.toString()}
                          value={group.group?.id ?? index.toString()}
                          disabled={!group.group}
                        >
                          {group.fellow.fellowName}{" "}
                          {group.group
                            ? `(${group.group.id})`
                            : "- No group assigned"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>

        <DataTable
          columns={columns({
            setAttendance,
            setAttendanceDialog: setMarkAttendanceDialog,
            session,
          })}
          editColumns={true}
          data={
            groups.find((group) => group.group?.id === selectedGroup)?.group
              ?.students ?? []
          }
          columnVisibilityState={{
            "Clinical cases": false,
            Age: false,
          }}
          emptyStateMessage={"No students associated to this group"}
          className="data-table data-table-action mt-4"
        />
        <MarkAttendance
          title={"Mark student attendance"}
          attendances={
            attendance?.studentAttendances.map((_attendance) => {
              const {
                id,
                studentId,
                attended,
                absenceReason,
                sessionId,
                comments,
              } = _attendance;
              return {
                attendanceId: id.toString(),
                id: studentId,
                attended,
                absenceReason,
                sessionId,
                schoolId: _attendance.schoolId,
                comments,
              };
            }) ?? []
          }
          id={attendance?.id}
          selectedSessionId={session?.id}
          sessionMode="single"
          isOpen={markAttendanceDialog}
          setIsOpen={setMarkAttendanceDialog}
          markAttendanceAction={markAttendance}
        >
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{attendance?.studentName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>{attendance?.assignedGroupId}</span>
            </div>
          </DialogAlertWidget>
        </MarkAttendance>
      </DialogContent>
    </Dialog>
  );
}

export type StudentAttendanceData = Prisma.StudentGetPayload<{
  include: {
    _count: {
      select: {
        clinicalCases: true;
      };
    };
    studentAttendances: true;
  };
}>;

const columns = (state: {
  setAttendance: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  session: Session | null;
}): ColumnDef<StudentAttendanceData>[] => [
  {
    id: "Student name",
    header: "Student name",
    cell: ({ row }) => {
      return (
        <span className="capitalize">
          {row.original.studentName?.toLowerCase()}
        </span>
      );
    },
  },
  {
    header: "Shamiri ID",
    id: "Shamiri ID",
    accessorKey: "visibleId",
  },
  {
    header: "Admission number",
    id: "Admission number",
    accessorKey: "admissionNumber",
  },
  {
    header: "Age",
    id: "Age",
    accessorFn: (row) =>
      row.yearOfBirth && new Date().getFullYear() - row.yearOfBirth + " yrs",
  },
  {
    header: "Clinical cases",
    id: "Clinical cases",
    accessorFn: (row) => {
      return row._count.clinicalCases;
    },
  },

  {
    cell: ({ row }) => {
      const attended =
        row.original.studentAttendances.find((attendance) => {
          return attendance.sessionId === state.session?.id;
        })?.attended ?? null;
      return (
        <div className="flex flex-row gap-1">
          <AttendanceStatusWidget attended={attended} />
        </div>
      );
    },
    header: "Attendance",
    id: "attendance",
    accessorKey: "attended",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <StudentAttendanceMenu
        state={state}
        attendance={row.original}
        disabled={!row.getCanSelect()}
      />
    ),
    enableHiding: false,
  },
];
