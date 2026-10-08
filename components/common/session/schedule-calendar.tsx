"use client";

import {
  createCalendar,
  type DateValue,
  getLocalTimeZone,
  toCalendarDate,
  today,
} from "@internationalized/date";
import type { ScheduleSupervisor } from "#/lib/actions/schedule-data";
import { ImplementerRole } from "#/db/enums";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  type Dispatch,
  type SetStateAction,
  Suspense,
  use,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type AriaButtonProps,
  mergeProps,
  useButton,
  useCalendar,
  useDateFormatter,
  useFocusRing,
  useLocale,
} from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { type CalendarState, useCalendarState } from "react-stately";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import FellowAttendance from "#/components/common/fellow/fellow-attendance";
import CancelSession from "#/components/common/session/cancel-session";
import RescheduleSession from "#/components/common/session/reschedule-session";
import { ScheduleNewSession } from "#/components/common/session/schedule-new-session-form";
import { SessionDetail } from "#/components/common/session/session-list";
import SessionRatings from "#/components/common/session/session-ratings";
import StudentAttendance from "#/components/common/student/student-attendance";
import SupervisorAttendance from "#/components/common/supervisor/supervisor-attendance";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import type { Session } from "#/lib/actions/fetch-sessions";
import {
  type Mode,
  parseScheduleView,
  sameRange,
  type ScheduleView,
  scheduleSearch,
  TIME_ZONE_COOKIE,
} from "#/lib/schedule-view";
import { cn } from "#/lib/utils";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { MonthView } from "./month-view";
import { ScheduleModeToggle } from "./schedule-mode-toggle";
import { TableView } from "./table-view";
import { WeekView } from "./week-view";
import type { school, sessionName } from "#/db/schema";

type School = Pick<typeof school.$inferSelect, "id" | "schoolName">;
type SessionName = Pick<typeof sessionName.$inferSelect, "id" | "sessionType" | "sessionLabel">;

type ScheduleCalendarProps = CalendarProps<DateValue> & {
  /** Sessions in the range the URL names; null until the server knows the viewer's time zone. */
  sessions: Promise<Session[]> | null;
  timeZone: string | null;
  /** Schools and session types for "Schedule a session" (hub coordinators and supervisors). */
  schools?: School[];
  supervisors?: ScheduleSupervisor[];
  fellowRatings?: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  supervisorId?: string;
  fellowId?: string;
  hubSessionTypes?: SessionName[];
};

export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const { sessions, timeZone: serverTimeZone, schools, ...calendarStateProps } = props;
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const browserTimeZone = getLocalTimeZone();
  const timeZone = serverTimeZone ?? browserTimeZone;
  const urlView = parseScheduleView((name) => searchParams.get(name), props.role, timeZone);
  const [view, setOptimisticView] = useOptimistic(urlView);
  const [navigating, startNavigation] = useTransition();
  const [newScheduleDialog, setNewScheduleDialog] = useState<boolean>(false);
  const loading = navigating || sessions === null;

  // effect: the server reads the browser's time zone from this cookie to work out the visible days
  useEffect(() => {
    if (browserTimeZone === serverTimeZone) return;
    // oxlint-disable-next-line unicorn/no-document-cookie -- one cookie, no Cookie Store API in all browsers yet
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(browserTimeZone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [browserTimeZone, serverTimeZone, router]);

  function navigate(next: Partial<ScheduleView>, history: "push" | "replace") {
    const search = scheduleSearch({ ...view, ...next });
    const params = new URLSearchParams(search);
    const target = parseScheduleView((name) => params.get(name), props.role, timeZone);
    if (history === "replace" && !navigating && sameRange(target, view)) {
      window.history.replaceState(null, "", search);
      return;
    }
    startNavigation(() => {
      setOptimisticView(target);
      router[history](search, { scroll: false });
    });
  }

  const calendarState = (visibleDuration?: { days?: number; weeks?: number; months?: number }) => ({
    value: today(timeZone),
    focusedValue: view.date,
    onFocusChange: (date: DateValue) => navigate({ date: toCalendarDate(date) }, "replace"),
    visibleDuration,
    locale,
    createCalendar,
  });

  const monthState = useCalendarState({ ...calendarStateProps, ...calendarState() });
  const weekState = useCalendarState(calendarState({ weeks: 1 }));
  const listState = useCalendarState(
    calendarState(
      view.span === "day" ? { days: 1 } : view.span === "week" ? { weeks: 1 } : { months: 1 },
    ),
  );
  const dayState = useCalendarState(calendarState({ days: 1 }));
  const tableState = useCalendarState(calendarState({ weeks: 1 }));

  const month = useCalendar(calendarStateProps, monthState);

  const week = useCalendar(calendarStateProps, weekState);

  const day = useCalendar(calendarStateProps, dayState);

  const list = useCalendar(calendarStateProps, listState);

  const table = useCalendar(calendarStateProps, tableState);

  const monthTitleFormatter = useDateFormatter({ month: "long", year: "numeric" });
  const dayTitleFormatter = useDateFormatter({ day: "numeric", month: "long" });
  const rangeTitleFormatter = useDateFormatter({
    dateStyle: "long",
    calendar: weekState.visibleRange.start.calendar.identifier,
  });
  const rangeTitle = (state: CalendarState) =>
    rangeTitleFormatter.formatRange(
      state.visibleRange.start.toDate(state.timeZone),
      state.visibleRange.end.toDate(state.timeZone),
    );

  const mode = view.mode;
  let title = "";
  let prevButtonProps: AriaButtonProps = {};
  let nextButtonProps: AriaButtonProps = {};
  switch (mode) {
    case "month":
      title = monthTitleFormatter.format(monthState.visibleRange.start.toDate(monthState.timeZone));
      prevButtonProps = month.prevButtonProps;
      nextButtonProps = month.nextButtonProps;
      break;
    case "week":
      title = rangeTitle(weekState);
      prevButtonProps = week.prevButtonProps;
      nextButtonProps = week.nextButtonProps;
      break;
    case "day":
      title = dayTitleFormatter.format(dayState.visibleRange.start.toDate(dayState.timeZone));
      prevButtonProps = day.prevButtonProps;
      nextButtonProps = day.nextButtonProps;
      break;
    case "table":
      title = rangeTitle(tableState);
      prevButtonProps = table.prevButtonProps;
      nextButtonProps = table.nextButtonProps;
      break;
    case "list":
      title = rangeTitle(listState);
      prevButtonProps = list.prevButtonProps;
      nextButtonProps = list.nextButtonProps;
      break;
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }

  const calendarView = {
    monthProps: { state: monthState, weekdayStyle: "long" as const },
    weekProps: { state: weekState },
    dayProps: { state: dayState },
    listProps: { state: listState },
    tableProps: { state: tableState },
    supervisors: props.supervisors,
    fellowRatings: props.fellowRatings,
    role: props.role,
    supervisorId: props.supervisorId,
    fellowId: props.fellowId,
    mode,
    loading,
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-start justify-between gap-6 lg:items-center">
            <h3 className="text-2xl font-semibold leading-8">{title}</h3>
            <NavigationButtons prevProps={prevButtonProps} nextProps={nextButtonProps} />
          </div>
          <div className="flex lg:mx-2">
            <ScheduleModeToggle
              role={props.role}
              mode={mode}
              onModeChange={(nextMode) => navigate({ mode: nextMode }, "push")}
            />
          </div>
        </div>
        {props.role === "HUB_COORDINATOR" || props.role === "SUPERVISOR" ? (
          <div className="flex items-center gap-4">
            <SessionsLoader loading={loading} />
            <CreateSessionButton
              open={newScheduleDialog}
              setDialogOpen={setNewScheduleDialog}
              schools={schools ?? []}
              hubSessionTypes={props.hubSessionTypes}
              role={props.role}
              loading={loading}
            />
          </div>
        ) : props.role === "ADMIN" ? (
          <SessionsLoader loading={loading} />
        ) : null}
      </div>
      <div className="mt-4 w-full">
        {sessions ? (
          <Suspense fallback={<CalendarView {...calendarView} sessions={[]} loading />}>
            <LoadedCalendarView {...calendarView} sessions={sessions} />
          </Suspense>
        ) : (
          <CalendarView {...calendarView} sessions={[]} />
        )}
      </div>
    </>
  );
}

function CreateSessionButton({
  open,
  setDialogOpen,
  schools,
  hubSessionTypes,
  role,
  loading,
}: {
  open: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
  schools: School[];
  hubSessionTypes?: SessionName[];
  role: ImplementerRole;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" disabled={loading} className="flex items-center gap-2 text-base">
          <Icons.plusCircle className="h-4 w-4" />
          <span>Schedule a session</span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader className="border-b">
            <DialogTitle className="pb-4 text-xl font-bold">Schedule a session</DialogTitle>
          </DialogHeader>
          <ScheduleNewSession
            toggleDialog={setDialogOpen}
            role={role}
            schools={schools}
            hubSessionTypes={hubSessionTypes ?? []}
          />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function SessionsLoader({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 text-shamiri-new-blue">
        {/* <Icons.spinner className="h-3.5 w-3.5 animate-spin" /> */}
        <svg
          className="-ml-1 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Loading sessions</span>
      </div>
    );
  }

  return null;
}

function CalendarView({
  monthProps,
  weekProps,
  dayProps,
  listProps,
  tableProps,
  supervisors,
  fellowRatings,
  role,
  supervisorId,
  fellowId,
  mode,
  loading,
  sessions,
}: {
  monthProps: {
    state: CalendarState;
    weekdayStyle: CalendarGridProps["weekdayStyle"];
  };
  weekProps: {
    state: CalendarState;
  };
  dayProps: {
    state: CalendarState;
  };
  listProps: {
    state: CalendarState;
  };
  tableProps: {
    state: CalendarState;
  };
  supervisors?: ScheduleSupervisor[];
  fellowRatings?: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  supervisorId?: string;
  fellowId?: string;
  mode: Mode;
  loading: boolean;
  sessions: Session[];
}) {
  const [supervisorAttendanceDialog, setSupervisorAttendanceDialog] = React.useState(false);
  const [fellowAttendanceDialog, setFellowAttendanceDialog] = React.useState(false);
  const [studentAttendanceDialog, setStudentAttendanceDialog] = React.useState(false);
  const [cancelSessionDialog, setCancelSessionDialog] = React.useState(false);
  const [rescheduleSessionDialog, setRescheduleSessionDialog] = React.useState(false);
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [sessionOccurrenceDialog, setSessionOccurrenceDialog] = useState<boolean>(false);
  const [selectedSession, setSession] = React.useState<Session | null>(null);
  const session = selectedSession
    ? (sessions.find((s) => s.id === selectedSession.id) ?? selectedSession)
    : null;

  const leaderIds = new Set(session?.school?.interventionGroups?.map((g) => g.leaderId) ?? []);
  const allFellows = supervisors?.flatMap((s) => s.fellows) ?? [];
  const fellowsForStudentAttendance =
    role === ImplementerRole.SUPERVISOR && supervisorId
      ? (supervisors?.find((s) => s.id === supervisorId)?.fellows ?? [])
      : allFellows.filter((f) => leaderIds.has(f.id));

  const activeMode = () => {
    switch (mode) {
      case "month":
        return (
          <MonthView
            {...monthProps}
            role={role}
            supervisorId={supervisorId}
            dialogState={{
              setSession,
              setFellowAttendanceDialog,
              setSupervisorAttendanceDialog,
              setStudentAttendanceDialog,
              setRatingsDialog,
              setSessionOccurrenceDialog,
              setRescheduleSessionDialog,
              setCancelSessionDialog,
            }}
            fellowId={fellowId}
            sessions={sessions}
          />
        );
      case "week":
        return weekProps.state.value ? (
          <WeekView
            {...weekProps}
            role={role}
            supervisorId={supervisorId}
            dialogState={{
              setSession,
              setFellowAttendanceDialog,
              setSupervisorAttendanceDialog,
              setStudentAttendanceDialog,
              setRatingsDialog,
              setSessionOccurrenceDialog,
              setRescheduleSessionDialog,
              setCancelSessionDialog,
            }}
            fellowId={fellowId}
            sessions={sessions}
          />
        ) : (
          <div>Loading...</div>
        );
      case "day":
        return dayProps.state.value ? (
          <DayView
            {...dayProps}
            role={role}
            dialogState={{
              setSession,
              setFellowAttendanceDialog,
              setSupervisorAttendanceDialog,
              setStudentAttendanceDialog,
              setRatingsDialog,
              setSessionOccurrenceDialog,
              setRescheduleSessionDialog,
              setCancelSessionDialog,
            }}
            supervisorId={supervisorId}
            fellowId={fellowId}
            sessions={sessions}
          />
        ) : (
          <div>Loading...</div>
        );
      case "list":
        return (
          <ListView
            {...listProps}
            role={role}
            supervisorId={supervisorId}
            dialogState={{
              setSession,
              setFellowAttendanceDialog,
              setSupervisorAttendanceDialog,
              setStudentAttendanceDialog,
              setRatingsDialog,
              setSessionOccurrenceDialog,
              setRescheduleSessionDialog,
              setCancelSessionDialog,
            }}
            fellowId={fellowId}
            sessions={sessions}
          />
        );
      case "table":
        if (role === ImplementerRole.HUB_COORDINATOR) {
          return (
            <TableView
              {...tableProps}
              supervisors={supervisors}
              role={role}
              supervisorId={supervisorId}
              sessions={sessions}
            />
          );
        }
        throw new Error(`User not authenticated: ${role}`);
      default:
        throw new Error(`Invalid mode: ${mode}`);
    }
  };

  return (
    <div className={cn(loading && "pointer-events-none opacity-50 grayscale")}>
      {activeMode()}
      {session ? (
        <>
          <RescheduleSession
            session={session}
            open={rescheduleSessionDialog}
            onOpenChange={setRescheduleSessionDialog}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </RescheduleSession>
          <CancelSession
            sessionId={session.id}
            open={cancelSessionDialog}
            onOpenChange={setCancelSessionDialog}
          >
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          </CancelSession>
        </>
      ) : null}
      <FellowAttendance
        supervisors={supervisors?.filter((supervisor) => supervisor.hubId === session?.hubId)}
        supervisorId={role === ImplementerRole.SUPERVISOR ? supervisorId : undefined}
        fellowRatings={fellowRatings ?? []}
        role={role}
        session={session}
        isOpen={fellowAttendanceDialog}
        setIsOpen={setFellowAttendanceDialog}
      />
      <SupervisorAttendance
        isOpen={supervisorAttendanceDialog}
        setIsOpen={setSupervisorAttendanceDialog}
        supervisors={supervisors?.filter((supervisor) => supervisor.hubId === session?.hubId)}
        role={role}
        session={session}
      />
      <StudentAttendance
        isOpen={studentAttendanceDialog}
        setIsOpen={setStudentAttendanceDialog}
        role={role}
        session={session}
        fellows={fellowsForStudentAttendance}
        fellowId={fellowId}
      />
      {session?.session?.sessionType === "INTERVENTION" && session?.schoolId && (
        <SessionRatings
          selectedSession={session}
          supervisorId={supervisorId}
          supervisors={supervisors}
          open={ratingsDialog}
          onOpenChange={setRatingsDialog}
          mode={
            role === "HUB_COORDINATOR" || role === "ADMIN"
              ? "view"
              : role === "SUPERVISOR"
                ? "add"
                : undefined
          }
          role={role}
        >
          {session && (
            <SessionDetail
              state={{ session }}
              layout={"compact"}
              withDropdown={false}
              role={role}
            />
          )}
        </SessionRatings>
      )}
      <MarkSessionOccurrence
        id={session?.id}
        defaultOccurrence={session?.occurred}
        isOpen={sessionOccurrenceDialog}
        setIsOpen={setSessionOccurrenceDialog}
        sessions={sessions}
      >
        {session && (
          <SessionDetail state={{ session }} layout={"compact"} withDropdown={false} role={role} />
        )}
      </MarkSessionOccurrence>
    </div>
  );
}

function NavigationButtons({
  prevProps,
  nextProps,
}: {
  prevProps: AriaButtonProps;
  nextProps: AriaButtonProps;
}) {
  return (
    <div className="inline-flex shrink-0 divide-x divide-gray-300 overflow-auto rounded-lg border border-gray-300 shadow-xs">
      <NavigationButton aria-label="Previous Month" {...prevProps}>
        <Icons.chevronLeft className="h-5 w-5" />
      </NavigationButton>

      <NavigationButton aria-label="Next Month" {...nextProps}>
        <Icons.chevronRight className="h-5 w-5" />
      </NavigationButton>
    </div>
  );
}

function NavigationButton({ children, ...props }: { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    // oxlint-disable-next-line react/button-has-type -- react-aria useButton supplies type
    <button
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      className={`inline-flex h-9 items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-0 ${
        isFocusVisible ? "ring-2 ring-blue-base ring-offset-2" : ""
      }`}
    >
      {children}
    </button>
  );
}

function LoadedCalendarView({
  sessions,
  ...props
}: Omit<React.ComponentProps<typeof CalendarView>, "sessions"> & { sessions: Promise<Session[]> }) {
  return <CalendarView {...props} sessions={use(sessions)} />;
}
