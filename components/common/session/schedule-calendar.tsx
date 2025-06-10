"use client";

import { createCalendar, type DateValue, getLocalTimeZone, today } from "@internationalized/date";
import { ImplementerRole, type Prisma, SessionStatus } from "@prisma/client";
import type { AriaButtonProps } from "@react-aria/button";
import { useButton } from "@react-aria/button";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { type Dispatch, type SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { useCalendar, useLocale } from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { type CalendarState, useCalendarState } from "react-stately";
import FilterToggle from "#/app/(platform)/hc/components/filter-toggle";
import SupervisorAttendance from "#/app/(platform)/hc/components/supervisor-attendance";
import {
  type DateRangeType,
  type Filters,
  FiltersContext,
  statusFilterOptions,
} from "#/app/(platform)/hc/schedule/context/filters-context";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import type { CurrentFellow } from "#/app/auth";
import FellowAttendance from "#/components/common/fellow/fellow-attendance";
import CancelSession from "#/components/common/session/cancel-session";
import RescheduleSession from "#/components/common/session/reschedule-session";
import { ScheduleNewSession } from "#/components/common/session/schedule-new-session-form";
import { SessionDetail } from "#/components/common/session/session-list";
import SessionRatings from "#/components/common/session/session-ratings";
import StudentAttendance from "#/components/common/student/student-attendance";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "#/components/ui/dropdown-menu";
import { cn, sessionDisplayName } from "#/lib/utils";
import { ImplementerRole, Prisma, SessionStatus } from "@prisma/client";
import * as React from "react";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { type Mode, ModeProvider, useMode } from "./mode-provider";
import { MonthView } from "./month-view";
import { ScheduleModeToggle } from "./schedule-mode-toggle";
import {
 type Session,
  SessionsContext,
  SessionsProvider,
  useSessions,
} from "./sessions-provider";
import { TableView } from "./table-view";
import { TitleProvider, useTitle } from "./title-provider";
import { WeekView } from "./week-view";

type ScheduleCalendarProps = CalendarProps<DateValue> & {
  hubId?: string;
  implementerId?: string;
  schools: Prisma.SchoolGetPayload<{}>[];
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
      fellows: {
        include: {
          fellowAttendances: true;
          groups: true;
        };
      };
      assignedSchools: true;
    };
  }>[];
  fellowRatings?: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  supervisorId?: string;
  fellow?: CurrentFellow;
  hubSessionTypes?: Prisma.SessionNameGetPayload<{}>[];
};

export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const { hubId, implementerId, schools, ...calendarStateProps } = props;
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "month";

  const sessionTypes: { [key: string]: boolean } = {};

  props.hubSessionTypes?.map((sessionType) => {
    sessionTypes[sessionType.sessionName] = true;
  });
  const [filters, setFilters] = useState<Filters>({
    sessionTypes,
    statusTypes: statusFilterOptions,
    dates: ["day", "week", "month"].includes(mode) ? (mode as DateRangeType) : "week",
  });
  const [newScheduleDialog, setNewScheduleDialog] = useState<boolean>(false);

  useEffect(() => {
    setFilters({
      sessionTypes,
      statusTypes: statusFilterOptions,
      dates: ["day", "week", "month"].includes(mode)
        ? (mode as DateRangeType)
        : "week",
    });
  }, [props.hubSessionTypes]);

  const monthState = useCalendarState({
    ...calendarStateProps,
    value: today(getLocalTimeZone()),
    locale,
    createCalendar,
  });

  const weekState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration: { weeks: 1 },
    locale,
    createCalendar,
  });

  const listState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration:
      filters.dates === "week"
        ? { weeks: 1 }
        : filters.dates === "day"
          ? { days: 1 }
          : { months: 1 },
    locale,
    createCalendar,
  });

  const dayState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration: { days: 1 },
    locale,
    createCalendar,
  });

  const tableState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration: { weeks: 1 },
    locale,
    createCalendar,
  });

  const month = useCalendar(calendarStateProps, monthState);

  const week = useCalendar(calendarStateProps, weekState);

  const day = useCalendar(calendarStateProps, dayState);

  const list = useCalendar(calendarStateProps, listState);

  const table = useCalendar(calendarStateProps, tableState);

  let title = "";
  let prevButtonProps: AriaButtonProps = {};
  let nextButtonProps: AriaButtonProps = {};
  switch (mode) {
    case "month":
      title = month.title;
      prevButtonProps = month.prevButtonProps;
      nextButtonProps = month.nextButtonProps;
      break;
    case "week":
      title = week.title;
      prevButtonProps = week.prevButtonProps;
      nextButtonProps = week.nextButtonProps;
      break;
    case "day":
      title = day.title;
      prevButtonProps = day.prevButtonProps;
      nextButtonProps = day.nextButtonProps;
      break;
    case "table":
      title = table.title;
      prevButtonProps = table.prevButtonProps;
      nextButtonProps = table.nextButtonProps;
      break;
    case "list":
      title = week.title;
      prevButtonProps = list.prevButtonProps;
      nextButtonProps = list.nextButtonProps;
      break;
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }

  return (
    <SessionsProvider
      hubId={hubId}
      implementerId={implementerId}
      filters={filters}
      role={props.role}
    >
      <ModeProvider defaultMode={mode as Mode}>
        <TitleProvider>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex items-start justify-between gap-6 lg:items-center">
                <ScheduleTitle fallbackTitle={title} />
                <NavigationButtons prevProps={prevButtonProps} nextProps={nextButtonProps} />
              </div>
              <div className="flex lg:mx-2">
                <ScheduleModeToggle role={props.role} />
              </div>
              <FiltersContext.Provider value={{ filters, setFilters }}>
                <ScheduleFilterToggle sessionFilters={props.hubSessionTypes ?? []} />
              </FiltersContext.Provider>
            </div>
            {props.role === "HUB_COORDINATOR" || props.role === "SUPERVISOR" ? (
              <div className="flex items-center gap-4">
                <SessionsLoader />
                <CreateSessionButton
                  open={newScheduleDialog}
                  setDialogOpen={setNewScheduleDialog}
                  schools={schools}
                  hubSessionTypes={props.hubSessionTypes}
                  role={props.role}
                />
              </div>
            ) : props.role === "ADMIN" ? (
              <SessionsLoader />
            ) : null}
          </div>
          <div className="mt-4 w-full">
            <FiltersContext.Provider value={{ filters, setFilters }}>
              <CalendarView
                monthProps={{ state: monthState, weekdayStyle: "long" }}
                weekProps={{ state: weekState }}
                dayProps={{ state: dayState }}
                listProps={{ state: listState, hubId }}
                tableProps={{ state: tableState, hubId }}
                supervisors={props.supervisors}
                fellowRatings={props.fellowRatings}
                role={props.role}
                supervisorId={props.supervisorId}
                fellow={props.fellow}
              />
            </FiltersContext.Provider>
          </div>
        </TitleProvider>
      </ModeProvider>
    </SessionsProvider>
  );
}

function CreateSessionButton({
  open,
  setDialogOpen,
  schools,
  hubSessionTypes,
  role,
}: {
  open: boolean;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
  schools: Prisma.SchoolGetPayload<{}>[];
  hubSessionTypes?: Prisma.SessionNameGetPayload<{}>[];
  role: ImplementerRole;
}) {
  const { loading } = useSessions({});
  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="brand"
          disabled={loading}
          className="flex items-center gap-2 text-base"
        >
          <Icons.plusCircle className="h-4 w-4" />
          <span>Schedule a session</span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader className="border-b">
            <span className="pb-4 text-xl font-bold">Schedule a session</span>
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

function ScheduleTitle({ fallbackTitle }: { fallbackTitle: string }) {
  const { title } = useTitle();

  return <div className="text-2xl font-semibold leading-8">{title || fallbackTitle}</div>;
}

function SessionsLoader() {
  const { loading } = useSessions({});

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
  fellow,
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
  supervisors?: Prisma.SupervisorGetPayload<{
    include: {
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
      fellows: {
        include: {
          fellowAttendances: true;
          groups: true;
        };
      };
      assignedSchools: true;
    };
  }>[];
  fellowRatings?: {
    id: string;
    averageRating: number;
  }[];
  role: ImplementerRole;
  supervisorId?: string;
  fellow?: CurrentFellow;
}) {
  const { mode } = useMode();
  const { loading } = useContext(SessionsContext);
  const [supervisorAttendanceDialog, setSupervisorAttendanceDialog] =
    React.useState(false);
  const [fellowAttendanceDialog, setFellowAttendanceDialog] =
    React.useState(false);
  const [studentAttendanceDialog, setStudentAttendanceDialog] =
    React.useState(false);
  const [cancelSessionDialog, setCancelSessionDialog] = React.useState(false);
  const [rescheduleSessionDialog, setRescheduleSessionDialog] = React.useState(false);
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [sessionOccurrenceDialog, setSessionOccurrenceDialog] = useState<boolean>(false);
  const [session, setSession] = React.useState<Session | null>(null);

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
            fellowId={fellow?.id}
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
            fellowId={fellow?.id}
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
            fellowId={fellow?.id}
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
            fellowId={fellow?.id}
          />
        );
      case "table":
        if (role === "HUB_COORDINATOR") {
          return (
            <TableView
              {...tableProps}
              supervisors={supervisors}
              role={role}
              supervisorId={supervisorId}
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
            role={role}
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
            role={role}
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
        supervisors={supervisors}
        supervisorId={role === "SUPERVISOR" ? supervisorId : undefined}
        fellowRatings={fellowRatings ?? []}
        role={role}
        session={session}
        isOpen={fellowAttendanceDialog}
        setIsOpen={setFellowAttendanceDialog}
      />
      <SupervisorAttendance
        isOpen={supervisorAttendanceDialog}
        setIsOpen={setSupervisorAttendanceDialog}
        supervisors={supervisors}
        role={role}
        session={session}
      />
      <StudentAttendance
        isOpen={studentAttendanceDialog}
        setIsOpen={setStudentAttendanceDialog}
        role={role}
        session={session}
        fellows={supervisors?.find((supervisor) => supervisor.id === supervisorId)?.fellows ?? []}
        fellowId={fellow?.id}
      />
      {session?.session?.sessionType === "INTERVENTION" && session?.schoolId && (
        <SessionRatings
          selectedSession={session}
          supervisorId={supervisorId}
          supervisors={supervisors}
          open={ratingsDialog}
          onOpenChange={setRatingsDialog}
          mode={
            role === ImplementerRole.HUB_COORDINATOR
              ? "view"
              : role === ImplementerRole.SUPERVISOR
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
    <div
      className="inline-flex shrink-0 divide-x divide-gray-300 overflow-auto rounded-xl border border-gray-300 shadow-sm"
      role="group"
    >
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

function ScheduleFilterToggle({
  sessionFilters,
}: {
  sessionFilters: Prisma.SessionNameGetPayload<{}>[];
}) {
  const [open, setOpen] = useState(false);
  const { filters, setFilters } = useContext(FiltersContext);
  const { mode } = useMode();
  const _sessionTypes: { [key: string]: boolean } = {};
  Object.keys(filters.sessionTypes).map((sessionType) => {
    _sessionTypes[sessionType] = true;
  });
  const defaultFilterSettings = {
    sessionTypes: _sessionTypes,
    statusTypes: statusFilterOptions,
    dates: ["day", "week", "month"].includes(mode) ? (mode as DateRangeType) : "week",
  };

  const [sessionTypes, setSessionTypes] = useState(filters.sessionTypes);
  const [statusTypes, setStatusTypes] = useState(filters.statusTypes);
  const [filterIsActive, setFilterIsActive] = useState(false);

  const dateFilterOptions: { label: string; value: DateRangeType }[] = [
    { label: "Today", value: "day" },
    { label: "This week", value: "week" },
    { label: "This month", value: "month" },
  ];
  const [dates, setDates] = useState(filters.dates);
  useEffect(() => {
    setDates(["day", "week", "month"].includes(mode) ? (mode as DateRangeType) : "week");
  }, [mode]);

  useEffect(() => {
    const sessionTypes = Object.keys(filters.sessionTypes).filter(
      (key) => !filters.sessionTypes[key],
    );
    const statusTypes = Object.keys(filters.statusTypes).filter((key) => !filters.statusTypes[key]);

    if (sessionTypes.length > 0 || statusTypes.length > 0) {
      setFilterIsActive(true);
    } else {
      setFilterIsActive(false);
      setSessionTypes(defaultFilterSettings.sessionTypes);
      setStatusTypes(defaultFilterSettings.statusTypes);
    }
  }, [filters]);

  return (
    <div className="flex items-center gap-3 lg:p-2">
      <FilterToggle
        filterIsActive={filterIsActive}
        setDefaultFilters={() => setFilters(defaultFilterSettings)}
        open={open}
        setOpen={setOpen}
      >
        <div className="flex flex-col gap-x-4 gap-y-2 lg:grid lg:grid-cols-5">
          <div className="lg:col-span-5">
            <DropdownMenuLabel>
              <span className="text-xs font-medium uppercase text-shamiri-text-grey">
                SESSION TYPE
              </span>
            </DropdownMenuLabel>
            <div className="gap-x-4 lg:grid lg:grid-cols-5">
              <div>
                {sessionFilters
                  .filter((sessionType) => sessionType.sessionType === "INTERVENTION")
                  .map((sessionType) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={sessionType.sessionName}
                        checked={sessionTypes[sessionType.sessionName]}
                        onCheckedChange={(value) => {
                          const state = { ...sessionTypes };
                          state[sessionType.sessionName] = value;
                          setSessionTypes(state);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <span className="uppercase">
                          {sessionDisplayName(sessionType.sessionName)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </div>
              <div>
                {sessionFilters
                  .filter((sessionType) => sessionType.sessionType === "DATA_COLLECTION")
                  .map((sessionType) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={sessionType.sessionName}
                        checked={sessionTypes[sessionType.sessionName]}
                        onCheckedChange={(value) => {
                          const state = { ...sessionTypes };
                          state[sessionType.sessionName] = value;
                          setSessionTypes(state);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <span className="uppercase">
                          {sessionDisplayName(sessionType.sessionName)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </div>
              <div>
                {sessionFilters
                  .filter((sessionType) => sessionType.sessionType === "SUPERVISION")
                  .map((sessionType) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={sessionType.sessionName}
                        checked={sessionTypes[sessionType.sessionName]}
                        onCheckedChange={(value) => {
                          const state = { ...sessionTypes };
                          state[sessionType.sessionName] = value;
                          setSessionTypes(state);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <span className="uppercase">
                          {sessionDisplayName(sessionType.sessionName)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </div>
              <div>
                {sessionFilters
                  .filter((sessionType) => sessionType.sessionType === "TRAINING")
                  .map((sessionType) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={sessionType.sessionName}
                        checked={sessionTypes[sessionType.sessionName]}
                        onCheckedChange={(value) => {
                          const state = { ...sessionTypes };
                          state[sessionType.sessionName] = value;
                          setSessionTypes(state);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <span className="uppercase">
                          {sessionDisplayName(sessionType.sessionName)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </div>
              <div>
                {sessionFilters
                  .filter((sessionType) => sessionType.sessionType === "CLINICAL")
                  .map((sessionType) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={sessionType.sessionName}
                        checked={sessionTypes[sessionType.sessionName]}
                        onCheckedChange={(value) => {
                          const state = { ...sessionTypes };
                          state[sessionType.sessionName] = value;
                          setSessionTypes(state);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <span className="uppercase">
                          {sessionDisplayName(sessionType.sessionName)}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </div>
            </div>
          </div>
          <div>
            <DropdownMenuLabel>
              <span className="text-xs font-medium uppercase text-shamiri-text-grey">Status</span>
            </DropdownMenuLabel>
            {Object.keys(SessionStatus).map((status) => {
              return (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusTypes[status]}
                  onCheckedChange={(value) => {
                    const state = { ...statusTypes };
                    state[status] = value;
                    setStatusTypes(state);
                  }}
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
                  <span className="">{status}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
          <div>
            <DropdownMenuLabel>
              <span className="text-xs font-medium uppercase text-shamiri-text-grey">
                Date Scheduled
              </span>
            </DropdownMenuLabel>
            {dateFilterOptions.map((date) => {
              return (
                <DropdownMenuCheckboxItem
                  key={date.value}
                  checked={dates === date.value}
                  onCheckedChange={(value) => {
                    setDates(date.value);
                  }}
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                  disabled={
                    mode === "day" || mode === "month" || mode === "week" || mode === "table"
                  }
                >
                  <span className="">{date.label}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              setFilters({
                sessionTypes,
                statusTypes,
                dates,
              });
              setOpen(false);
            }}
          >
            Filter sessions
          </Button>
        </div>
      </FilterToggle>
    </div>
  );
}
