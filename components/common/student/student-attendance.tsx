import { ImplementerRole } from "#/db/enums";
import type { fellow } from "#/db/schema";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  Suspense,
  use,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { SessionDetail } from "#/components/common/session/session-list";
import type { Session } from "#/lib/actions/fetch-sessions";
import ViewAttendanceDocument from "#/components/common/student/student-attendance-files/view-attendance-document";
import StudentAttendanceMenu, {
  type StudentTriage,
} from "#/components/common/student/student-attendance-menu";
import StudentTriageHistoryModal from "#/components/common/student/student-triage-history-modal";
import TriageEventModal from "#/components/common/student/triage-event-modal";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
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
import { Skeleton } from "#/components/ui/skeleton";
import { toast } from "#/components/ui/use-toast";
import { fetchSessionStudentAttendance } from "#/lib/actions/session/session";
import { markManyStudentsAttendance, markStudentAttendance } from "#/lib/actions/student";
import type { TriageEventWithRelations } from "#/lib/actions/triage";
import {
  getStudentTriageHistory,
  getSupervisorsInFellowHub,
  getTriageEventByStudentAndSession,
  getTriageEventsForSession,
} from "#/lib/actions/triage";
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
  fellows: Pick<typeof fellow.$inferSelect, "id" | "fellowName">[];
  fellowId?: string;
}) {
  // The session the dialog was open on at the last render; null while it is closed.
  const [shownSessionId, setShownSessionId] = useState<string | null>(null);
  // Kept after closing, so the content stays through the close animation.
  const [opening, setOpening] = useState<Opening | null>(null);
  // The caller opens the dialog through isOpen, so no handler here runs on opening. The render
  // that first sees it open, or open on another session, starts that opening's loads.
  const openSessionId = isOpen ? (session?.id ?? null) : null;
  if (openSessionId !== shownSessionId) {
    setShownSessionId(openSessionId);
    if (openSessionId) {
      setOpening(startOpening(openSessionId, role, (opening?.number ?? 0) + 1));
    }
  }

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
        {session && opening?.sessionId === session.id && (
          <Suspense key={opening.number} fallback={<StudentsLoading />}>
            <StudentAttendanceContent
              opening={opening}
              session={session}
              role={role}
              fellows={fellows}
              fellowId={fellowId}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SessionAttendance = Awaited<
  ReturnType<typeof fetchSessionStudentAttendance>
>["attendances"][number];

type StudentsLoad =
  | {
      status: "loaded";
      studentsByGroup: Map<string, StudentAttendanceData[]>;
      attendances: SessionAttendance[];
    }
  | { status: "failed" };

type TriageEventsLoad =
  | { status: "loaded"; byStudent: Record<string, TriageEventWithRelations> }
  | { status: "failed" };

/** One opening of the dialog on a session, with the loads it started. */
type Opening = {
  /** Counts openings, so each one mounts fresh content, even on the session shown before. */
  number: number;
  sessionId: string;
  students: Promise<StudentsLoad>;
  /** Null for roles that don't triage. */
  triageEvents: Promise<TriageEventsLoad> | null;
};

/**
 * Starts an opening's loads while the dialog renders. Each load calls its server action a
 * microtask late, because calling one updates the router's state, which React forbids while
 * another component renders. The loads never reject: use() would throw a failure to the page's
 * error boundary.
 */
function startOpening(sessionId: string, role: ImplementerRole, number: number): Opening {
  return {
    number,
    sessionId,
    students: loadStudents(sessionId),
    triageEvents: role === ImplementerRole.FELLOW ? loadTriageEvents(sessionId) : null,
  };
}

function loadStudents(sessionId: string): Promise<StudentsLoad> {
  return Promise.resolve()
    .then(() => fetchSessionStudentAttendance(sessionId))
    .then(({ students, attendances }): StudentsLoad => ({
      status: "loaded",
      studentsByGroup: studentsByAssignedGroup(students),
      attendances,
    }))
    .catch((): StudentsLoad => ({ status: "failed" }));
}

function loadTriageEvents(sessionId: string): Promise<TriageEventsLoad> {
  return Promise.resolve()
    .then(() => getTriageEventsForSession(sessionId))
    .then((events): TriageEventsLoad => ({
      status: "loaded",
      byStudent: Object.fromEntries(events.map((event) => [event.studentId, event])),
    }))
    .catch((): TriageEventsLoad => ({ status: "failed" }));
}

function studentsByAssignedGroup(students: StudentAttendanceData[]) {
  const byGroup = new Map<string, StudentAttendanceData[]>();
  for (const student of students) {
    const groupId = student.assignedGroupId ?? "";
    byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), student]);
  }
  return byGroup;
}

type ContentProps = {
  session: Session;
  role: ImplementerRole;
  fellows: Pick<typeof fellow.$inferSelect, "id" | "fellowName">[];
  fellowId?: string;
};

function StudentAttendanceContent({ opening, ...props }: ContentProps & { opening: Opening }) {
  const students = use(opening.students);
  if (students.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the students and their attendance</AlertTitle>
        <AlertDescription>Close the dialog and try again, or reload the page.</AlertDescription>
      </Alert>
    );
  }
  return (
    <SessionStudents
      {...props}
      studentsByGroup={students.studentsByGroup}
      loadedAttendances={students.attendances}
      openingTriageEvents={opening.triageEvents}
    />
  );
}

function SessionStudents({
  session,
  role,
  fellows,
  fellowId,
  studentsByGroup,
  loadedAttendances,
  openingTriageEvents,
}: ContentProps & {
  studentsByGroup: Map<string, StudentAttendanceData[]>;
  loadedAttendances: SessionAttendance[];
  openingTriageEvents: Promise<TriageEventsLoad> | null;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [attendance, setAttendance] = useState<StudentAttendanceData>();
  const [markAttendanceDialog, setMarkAttendanceDialog] = useState(false);
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<RowSelectionState>({});
  const [triage, setTriage] = useState<TriageDialog | null>(null);
  const [history, setHistory] = useState<{
    student: StudentAttendanceData;
    events: ReturnType<typeof getStudentTriageHistory>;
  } | null>(null);
  // Marking attendance replies with the session's attendances, which replace the loaded ones.
  const [sessionAttendances, setSessionAttendances] = useState(loadedAttendances);
  // Saving a triage replaces the request with a reload.
  const [triageEventsRequest, setTriageEventsRequest] = useState(openingTriageEvents);
  const triageEvents = triageEventsRequest && use(triageEventsRequest);
  // Null while the caller can't triage: their role doesn't, or the records failed to load, so
  // whether a student has a saved triage is unknown.
  const triageEventsByStudent = triageEvents?.status === "loaded" ? triageEvents.byStudent : null;

  const attendanceByStudentId = Object.fromEntries(sessionAttendances.map((a) => [a.studentId, a]));

  function openTriageModal(student: StudentAttendanceData, readOnly: boolean) {
    const isThisTriage = (current: TriageDialog | null): current is TriageDialog =>
      current?.student.id === student.id;

    setTriage({ student, readOnly, supervisors: [] });
    getTriageEventByStudentAndSession(student.id, session.id)
      .then((event) =>
        setTriage((current) => (isThisTriage(current) ? { ...current, event } : current)),
      )
      .catch(() => {
        setTriage((current) => (isThisTriage(current) ? null : current));
        toast({
          variant: "destructive",
          description: "Could not load the triage record. Please try again.",
        });
      });
    getSupervisorsInFellowHub(session.id)
      .then((supervisors) =>
        setTriage((current) => (isThisTriage(current) ? { ...current, supervisors } : current)),
      )
      .catch(() => {
        toast({
          variant: "destructive",
          description: "Could not load the supervisors in your hub.",
        });
      });
  }

  const reloadTriageEvents = () => {
    // A transition keeps the table on screen while the records reload, instead of the fallback.
    startTransition(() => setTriageEventsRequest(loadTriageEvents(session.id)));
  };

  const form = useForm<{ fellow: string }>({
    defaultValues: {
      fellow: undefined,
    },
  });

  const groups = fellows.map((fellow) => {
    const group = session.school?.interventionGroups.find((group) => group.leaderId === fellow.id);
    return { fellow, group };
  });

  const groupStudents =
    studentsByGroup.get(
      selectedGroup ??
        session.school?.interventionGroups.find((group) => group.leaderId === fellowId)?.id ??
        "",
    ) ?? NO_STUDENTS;
  const selectedStudents = groupStudents.filter((student) => selectedStudentIds[student.id]);

  const memoizedColumns = columns({
    setAttendance,
    setAttendanceDialog: setMarkAttendanceDialog,
    openTriageModal,
    openHistory: (student: StudentAttendanceData) =>
      setHistory({ student, events: getStudentTriageHistory(student.id) }),
    triageEventsByStudent,
    attendanceByStudentId,
    role,
  });

  const saveAttendance = async (
    pending: ReturnType<typeof markStudentAttendance | typeof markManyStudentsAttendance>,
  ) => {
    const res = await pending;
    if (res.attendances) {
      setSessionAttendances(res.attendances);
    }
    return res;
  };

  const renderTableActions = () => {
    return role !== ImplementerRole.ADMIN ? (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1"
          disabled={selectedStudents.length === 0}
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
    <>
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
                      setSelectedStudentIds({});
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

      {selectedGroup && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-shamiri-new-blue" />
            <h3 className="text-sm font-semibold text-shamiri-text-dark-grey">
              Attendance Uploads
            </h3>
          </div>
          <ViewAttendanceDocument sessionId={session.id} groupId={selectedGroup} role={role} />
        </div>
      )}

      {triageEvents?.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the triage records</AlertTitle>
          <AlertDescription>
            Triage is unavailable until they load. Close the dialog and try again, or reload the
            page.
          </AlertDescription>
        </Alert>
      )}
      {triageEventsByStudent && (
        <TriageSessionSummary triageEventsByStudent={triageEventsByStudent} />
      )}
      <DataTable
        columns={memoizedColumns}
        editColumns={true}
        data={groupStudents}
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
        getRowId={(student) => student.id}
        rowSelection={selectedStudentIds}
        onRowSelectionChange={setSelectedStudentIds}
      />
      <MarkAttendance
        title={"Mark student attendance"}
        attendances={(() => {
          const a = attendance?.id ? attendanceByStudentId[attendance.id] : undefined;
          if (!a) return [];
          return [
            {
              attendanceId: a.id.toString(),
              id: a.studentId,
              attended: a.attended,
              absenceReason: a.absenceReason,
              sessionId: a.sessionId,
              comments: a.comments,
            },
          ];
        })()}
        id={attendance?.id}
        selectedSessionId={session.id}
        selectedIds={selectedStudents.map((student) => student.id)}
        sessionMode="single"
        isOpen={markAttendanceDialog}
        setIsOpen={setMarkAttendanceDialog}
        markAttendanceAction={(data) => saveAttendance(markStudentAttendance(data))}
        markBulkAttendanceAction={(ids, data) =>
          saveAttendance(markManyStudentsAttendance(ids, data))
        }
        bulkMode={bulkMode}
        setBulkMode={setBulkMode}
        onSuccess={() => {
          setSelectedStudentIds({});
          setBulkMode(false);
        }}
      >
        <DialogAlertWidget>
          <p className="flex flex-wrap items-center gap-2">
            <span>
              {bulkMode ? (
                <span>{selectedStudents.length} students</span>
              ) : (
                <span>{attendance?.studentName}</span>
              )}
            </span>
            <span className="bg-shamiri-new-blue h-1 w-1 rounded-full">{""}</span>
            <span>{sessionDisplayName(session.session?.sessionName ?? "")}</span>
            <span className="bg-shamiri-new-blue h-1 w-1 rounded-full">{""}</span>
            <span>{session.school?.schoolName ?? session.venue}</span>
          </p>
        </DialogAlertWidget>
      </MarkAttendance>
      {triage && (
        <TriageEventModal
          onClose={() => setTriage(null)}
          studentId={triage.student.id}
          studentName={triage.student.studentName}
          sessionId={session.id}
          sessionName={sessionDisplayName(session.session?.sessionName ?? "")}
          existingEvent={triage.event ?? undefined}
          loadingExistingEvent={triage.event === undefined}
          supervisors={triage.supervisors}
          readOnly={triage.readOnly}
          onSuccess={reloadTriageEvents}
        />
      )}
      {history && (
        <StudentTriageHistoryModal
          onClose={() => setHistory(null)}
          studentName={history.student.studentName}
          events={history.events}
        />
      )}
    </>
  );
}

const LOADING_ROWS = ["first", "second", "third", "fourth"];

function StudentsLoading() {
  return (
    <div className="space-y-2 lg:mt-4">
      {LOADING_ROWS.map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** The open triage modal. `event` is undefined until its read resolves, and null when none exists. */
type TriageDialog = {
  student: StudentAttendanceData;
  readOnly: boolean;
  event?: Awaited<ReturnType<typeof getTriageEventByStudentAndSession>>;
  supervisors: Awaited<ReturnType<typeof getSupervisorsInFellowHub>>;
};

export type StudentAttendanceData = Awaited<
  ReturnType<typeof fetchSessionStudentAttendance>
>["students"][number];

const NO_STUDENTS: StudentAttendanceData[] = [];

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

function triageOf(
  triageEventsByStudent: Record<string, TriageEventWithRelations> | null,
  studentId: string,
): StudentTriage {
  if (!triageEventsByStudent) return "unavailable";
  return triageEventsByStudent[studentId] ? "documented" : "none";
}

const columns = (state: {
  setAttendance: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  openTriageModal: (triageTarget: StudentAttendanceData, readOnly: boolean) => void;
  openHistory: (student: StudentAttendanceData) => void;
  triageEventsByStudent: Record<string, TriageEventWithRelations> | null;
  attendanceByStudentId: Record<string, SessionAttendance>;
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
    accessorKey: "studentName",
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
      return row.clinicalCasesCount;
    },
  },

  {
    cell: ({ row }) => {
      const attended = state.attendanceByStudentId[row.original.id]?.attended ?? null;
      const triageEvent = state.triageEventsByStudent?.[row.original.id];
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
        state={state}
        attendance={row.original}
        disabled={!row.getCanSelect()}
        triage={triageOf(state.triageEventsByStudent, row.original.id)}
      />
    ),
    enableHiding: false,
  },
];
