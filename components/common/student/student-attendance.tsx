import { revalidatePageAction } from "#/app/(platform)/fel/schools/actions";
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
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import {
  markManyStudentsAttendance,
  markStudentAttendance,
} from "#/lib/actions/student";
import { sessionDisplayName } from "#/lib/utils";
import { ImplementerRole, Prisma } from "@prisma/client";
import { ColumnDef, Row } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
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
  fellowId,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  session: Session | null;
  fellows: Prisma.FellowGetPayload<{}>[];
  fellowId?: string;
}) {
  const pathname = usePathname();
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
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<
    Row<StudentAttendanceData>[]
  >([]);

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
    const [res] = await Promise.all([
      await markStudentAttendance(data),
      await revalidatePageAction(pathname),
      await refresh(),
    ]);
    return res;
  };

  const markBulkAttendance = async (
    ids: string[],
    data: z.infer<typeof MarkAttendanceSchema>,
  ) => {
    const [res] = await Promise.all([
      await markManyStudentsAttendance(ids, data),
      await revalidatePageAction(pathname),
      await refresh(),
    ]);
    return res;
  };

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1"
          disabled={selectedRows.length === 0}
          onClick={() => {
            setBulkMode(true);
            setMarkAttendanceDialog(true);
          }}
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Mark student attendance</span>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogContent className="w-3/4 max-w-none">
        <DialogHeader>
          <span className="text-xl font-bold">
            {role === "HUB_COORDINATOR"
              ? "View student attendance"
              : role === "SUPERVISOR" || role === "FELLOW"
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

        {role !== "FELLOW" ? (
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
                      <SelectContent className="max-h-[200px]">
                        {groups.map((group, index) => (
                          <SelectItem
                            key={group.group?.id ?? index.toString()}
                            value={group.group?.id ?? index.toString()}
                            disabled={!group.group}
                          >
                            {group.fellow.fellowName}{" "}
                            {group.group
                              ? `(${group.group.groupName})`
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
        ) : null}

        <DataTable
          columns={columns({
            setAttendance,
            setAttendanceDialog: setMarkAttendanceDialog,
            session,
          })}
          editColumns={true}
          data={
            groups.find((group) => group.group?.id === selectedGroup)?.group
              ?.students ??
            sessions
              .find((x) => x.id === session?.id)
              ?.school?.interventionGroups.find(
                (group) => group.leaderId === fellowId,
              )?.students ??
            session?.school?.interventionGroups.find(
              (group) => group.leaderId === fellowId,
            )?.students ??
            []
          }
          columnVisibilityState={{
            "Clinical cases": false,
            "Shamiri ID": false,
            Age: false,
          }}
          emptyStateMessage={"No students associated to this group"}
          className="data-table data-table-action mt-4"
          renderTableActions={renderTableActions()}
          onRowSelectionChange={setSelectedRows}
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
          selectedIds={selectedRows.map((student) => student.original.id)}
          sessionMode="single"
          isOpen={markAttendanceDialog}
          setIsOpen={setMarkAttendanceDialog}
          markAttendanceAction={markAttendance}
          markBulkAttendanceAction={markBulkAttendance}
          bulkMode={bulkMode}
          setBulkMode={setBulkMode}
        >
          <DialogAlertWidget>
            <p className="flex flex-wrap items-center gap-2">
              <span>
                {bulkMode ? (
                  <span>{selectedRows.length} students</span>
                ) : (
                  <span>{attendance?.studentName}</span>
                )}
              </span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {sessionDisplayName(session?.session?.sessionName ?? "")}
              </span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>{session?.school?.schoolName ?? session?.venue}</span>
            </p>
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
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
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
