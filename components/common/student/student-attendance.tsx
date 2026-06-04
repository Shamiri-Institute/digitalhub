import { type Fellow, ImplementerRole, type Prisma } from "@prisma/client";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/fel/schools/actions";
import type { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { SessionDetail } from "#/components/common/session/session-list";
import { type Session, SessionsContext } from "#/components/common/session/sessions-provider";
import StudentAttendanceMenu from "#/components/common/student/student-attendance-menu";
import StudentTriageHistoryModal from "#/components/common/student/student-triage-history-modal";
import TriageEventModal from "#/components/common/student/triage-event-modal";
import ViewAttendanceDocument from "#/components/common/student/student-attendance-files/view-attendance-document";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
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
import { markManyStudentsAttendance, markStudentAttendance } from "#/lib/actions/student";
import type { TriageEventWithRelations } from "#/lib/actions/triage";
import { getTriageEventByStudentAndSession, getTriageEventsForSession } from "#/lib/actions/triage";
import { cn, sessionDisplayName } from "#/lib/utils";

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
  fellows: Fellow[];
  fellowId?: string;
}) {
  const pathname = usePathname();
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [attendance, setAttendance] = useState<StudentAttendanceData>();
  const [markAttendanceDialog, setMarkAttendanceDialog] = useState(false);
  const [groups, setGroups] = useState<
    {
      fellow: Fellow;
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
  const [selectedRows, setSelectedRows] = useState<Row<StudentAttendanceData>[]>([]);
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [triageReadOnly, setTriageReadOnly] = useState(false);
  const [triageStudent, setTriageStudent] = useState<StudentAttendanceData | undefined>();
  const [triageExistingEvent, setTriageExistingEvent] = useState<Awaited<
    ReturnType<typeof getTriageEventByStudentAndSession>
  > | null>(null);
  const [triageEventsByStudent, setTriageEventsByStudent] = useState<
    Record<string, TriageEventWithRelations>
  >({});
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentAttendanceData | undefined>();

  const form = useForm<{ fellow: string }>({
    defaultValues: {
      fellow: undefined,
    },
  });

  useEffect(() => {
    const groups = fellows.map((fellow) => {
      const _session = sessions.length > 0 ? sessions.find((x) => x.id === session?.id) : session;
      const group = _session?.school?.interventionGroups.find(
        (group) => group.leaderId === fellow.id,
      );
      return { fellow, group };
    });

    setGroups(groups);
    setSessions(sessions);
  }, [fellows, session, sessions]);

  useEffect(() => {
    if (!triageModalOpen || !triageStudent?.id || !session?.id) {
      setTriageExistingEvent(null);
      return;
    }
    const load = async () => {
      try {
        const event = await getTriageEventByStudentAndSession(triageStudent.id, session.id);
        setTriageExistingEvent(event);
      } catch {
        setTriageExistingEvent(null);
      }
    };
    void load();
  }, [triageModalOpen, triageStudent?.id, session?.id]);

  const loadTriageEventsForSession = async () => {
    if (!session?.id) return;
    try {
      const events = await getTriageEventsForSession(session.id);
      setTriageEventsByStudent(Object.fromEntries(events.map((e) => [e.studentId, e])));
    } catch {
      setTriageEventsByStudent({});
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTriageEventsByStudent({});
      return;
    }
    void loadTriageEventsForSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.id is the only changing dep
  }, [isOpen, session?.id]);

  const markAttendance = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    const [res] = await Promise.all([
      await markStudentAttendance(data),
      await revalidatePageAction(pathname),
      await refresh(),
    ]);
    return res;
  };

  const markBulkAttendance = async (ids: string[], data: z.infer<typeof MarkAttendanceSchema>) => {
    const [res] = await Promise.all([
      await markManyStudentsAttendance(ids, data),
      await revalidatePageAction(pathname),
      await refresh(),
    ]);
    return res;
  };

  const renderTableActions = () => {
    return role !== ImplementerRole.ADMIN ? (
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
          <Icons.fileDown className="text-shamiri-text-grey h-4 w-4" />
          <span>Mark student attendance</span>
        </Button>
      </div>
    ) : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogContent className="lg:w-3/4 lg:max-w-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
              ? "View student attendance"
              : role === ImplementerRole.SUPERVISOR || role === ImplementerRole.FELLOW
                ? "Mark student attendance"
                : null}
          </DialogTitle>
        </DialogHeader>
        {session && (
          <SessionDetail state={{ session }} layout={"compact"} withDropdown={false} role={role} />
        )}

        {role !== "FELLOW" ? (
          <div className="my-4">
            <Form {...form}>
              <FormField
                control={form.control}
                name="fellow"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="pt-2">Select group leader</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedGroup(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="mt-1">
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
                            {group.group ? `(${group.group.groupName})` : "- No group assigned"}
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

        {selectedGroup && session && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-full bg-shamiri-new-blue" />
              <h3 className="text-sm font-semibold text-shamiri-text-dark-grey">
                Attendance Uploads
              </h3>
            </div>
            <ViewAttendanceDocument sessionId={session.id} groupId={selectedGroup} />
          </div>
        )}

        {Object.keys(triageEventsByStudent).length > 0 && (
          <TriageSessionSummary triageEventsByStudent={triageEventsByStudent} />
        )}
        <DataTable
          columns={columns({
            setAttendance,
            setAttendanceDialog: setMarkAttendanceDialog,
            setTriageStudent,
            setTriageModalOpen,
            setTriageReadOnly,
            setHistoryStudent,
            setHistoryModalOpen,
            triageEventsByStudent,
            session,
            role,
          })}
          editColumns={true}
          data={
            groups.find((group) => group.group?.id === selectedGroup)?.group?.students ??
            sessions
              .find((x) => x.id === session?.id)
              ?.school?.interventionGroups.find((group) => group.leaderId === fellowId)?.students ??
            session?.school?.interventionGroups.find((group) => group.leaderId === fellowId)
              ?.students ??
            []
          }
          columnVisibilityState={{
            "Clinical cases": false,
            "Shamiri ID": false,
            Age: false,
            checkbox: role !== ImplementerRole.ADMIN,
            button: role !== ImplementerRole.ADMIN,
          }}
          emptyStateMessage={"No students associated to this group"}
          className="data-table data-table-action lg:mt-4"
          renderTableActions={renderTableActions()}
          onRowSelectionChange={setSelectedRows}
        />
        <MarkAttendance
          title={"Mark student attendance"}
          attendances={
            attendance?.studentAttendances.map((_attendance) => {
              const { id, studentId, attended, absenceReason, sessionId, comments } = _attendance;
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
              <span className="bg-shamiri-new-blue h-1 w-1 rounded-full">{""}</span>
              <span>{sessionDisplayName(session?.session?.sessionName ?? "")}</span>
              <span className="bg-shamiri-new-blue h-1 w-1 rounded-full">{""}</span>
              <span>{session?.school?.schoolName ?? session?.venue}</span>
            </p>
          </DialogAlertWidget>
        </MarkAttendance>
        {session && triageStudent && (
          <TriageEventModal
            isOpen={triageModalOpen}
            setIsOpen={(open) => {
              setTriageModalOpen(open);
              if (!open) setTriageReadOnly(false);
            }}
            studentId={triageStudent.id}
            studentName={triageStudent.studentName}
            sessionId={session.id}
            sessionName={sessionDisplayName(session.session?.sessionName ?? "")}
            hubId={session.hubId ?? undefined}
            existingEvent={triageExistingEvent ?? undefined}
            readOnly={triageReadOnly}
            onSuccess={async () => {
              await refresh();
              await loadTriageEventsForSession();
            }}
          />
        )}
        {historyStudent && (
          <StudentTriageHistoryModal
            isOpen={historyModalOpen}
            onClose={() => setHistoryModalOpen(false)}
            studentId={historyStudent.id}
            studentName={historyStudent.studentName}
          />
        )}
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

const TRIAGE_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPPORTED: {
    label: "Triaged",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  REFERRED: {
    label: "Escalated",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  ESCALATED: {
    label: "Escalated",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  REFUSED: {
    label: "Refused referral",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  INTERRUPTED: {
    label: "Interrupted",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
};

function TriageBadge({ event }: { event: TriageEventWithRelations }) {
  const action = event.actionTaken;
  const isIncomplete = event.riskScreenOutcome === "NOT_COMPLETED" && !action;

  if (isIncomplete) {
    return (
      <span className="text-shamiri-text-grey rounded border px-1.5 py-0.5 text-xs">
        Incomplete
      </span>
    );
  }

  const config = action ? TRIAGE_BADGE_CONFIG[action] : null;
  if (!config) return null;

  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-xs", config.className)}>
      {config.label}
    </span>
  );
}

function TriageSessionSummary({
  triageEventsByStudent,
}: {
  triageEventsByStudent: Record<string, TriageEventWithRelations>;
}) {
  const events = Object.values(triageEventsByStudent);
  const total = events.length;
  if (total === 0) return null;

  const escalated = events.filter(
    (e) => e.actionTaken === "ESCALATED" || e.actionTaken === "REFERRED",
  ).length;
  const supported = events.filter((e) => e.actionTaken === "SUPPORTED").length;
  const incomplete = events.filter((e) => e.riskScreenOutcome === "NOT_COMPLETED").length;

  const parts: string[] = [];
  if (escalated > 0) parts.push(`${escalated} escalated`);
  if (supported > 0) parts.push(`${supported} supported`);
  if (incomplete > 0) parts.push(`${incomplete} incomplete`);

  return (
    <p className="text-shamiri-text-grey text-sm">
      <span className="text-shamiri-text-dark-grey font-medium">
        {total} student{total !== 1 ? "s" : ""} triaged
      </span>
      {parts.length > 0 && ` — ${parts.join(", ")}`}
    </p>
  );
}

const columns = (state: {
  setAttendance: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  setTriageStudent: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setTriageModalOpen: Dispatch<SetStateAction<boolean>>;
  setTriageReadOnly: Dispatch<SetStateAction<boolean>>;
  setHistoryStudent: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setHistoryModalOpen: Dispatch<SetStateAction<boolean>>;
  triageEventsByStudent: Record<string, TriageEventWithRelations>;
  session: Session | null;
  role: ImplementerRole;
}): ColumnDef<StudentAttendanceData>[] => [
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
          "border-shamiri-light-grey data-[state=checked]:bg-shamiri-new-blue h-5 w-5 bg-white"
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
              "border-shamiri-light-grey data-[state=checked]:bg-shamiri-new-blue h-5 w-5 bg-white"
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
      return <span className="capitalize">{row.original.studentName?.toLowerCase()}</span>;
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
    accessorFn: (row) => row.yearOfBirth && `${new Date().getFullYear() - row.yearOfBirth} yrs`,
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
      const triageEvent = state.triageEventsByStudent[row.original.id];
      return (
        <div className="flex flex-row flex-wrap items-center gap-1">
          <AttendanceStatusWidget attended={attended} />
          {triageEvent && <TriageBadge event={triageEvent} />}
        </div>
      );
    },
    header: "Attendance",
    id: "Attendance",
    accessorKey: "attended",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <StudentAttendanceMenu
        state={{
          ...state,
          setHistoryStudent: state.setHistoryStudent,
          setHistoryModalOpen: state.setHistoryModalOpen,
        }}
        attendance={row.original}
        disabled={!row.getCanSelect()}
        hasExistingTriageEvent={!!state.triageEventsByStudent[row.original.id]}
      />
    ),
    enableHiding: false,
  },
];
