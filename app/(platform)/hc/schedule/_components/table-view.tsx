import {
  FellowAttendanceDataTable,
  FellowAttendancesTableData,
  columns as fellowAttendanceColumns,
} from "#/app/(platform)/hc/schedule/_components/fellow-attendance";
import {
  Session,
  SessionsContext,
} from "#/app/(platform)/hc/schedule/_components/sessions-provider";
import {
  SupervisorAttendanceDataTable,
  SupervisorAttendanceTableData,
  columns as supervisorAttendanceColumns,
} from "#/app/(platform)/hc/schedule/_components/supervisor-attendance";
import { useTitle } from "#/app/(platform)/hc/schedule/_components/title-provider";
import { fetchDayFellowAttendances } from "#/app/(platform)/hc/schedule/actions/fellow-attendances";
import {
  Filters,
  FiltersContext,
} from "#/app/(platform)/hc/schedule/context/filters-context";
import { Icons } from "#/components/icons";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { toast } from "#/components/ui/use-toast";
import { fetchFellowsWithSupervisor } from "#/lib/actions/fetch-fellows";
import { fetchSupervisorAttendances } from "#/lib/actions/fetch-supervisors";
import { getCalendarDate } from "#/lib/date-utils";
import { cn, sessionDisplayName } from "#/lib/utils";
import { CalendarDate } from "@internationalized/date";
import { SessionStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/table-core";
import { addDays, format, isBefore, isWithinInterval } from "date-fns";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

type Role = "supervisors" | "fellows";

function getSupervisorAttendanceColumns() {
  const columnHelper = createColumnHelper<SupervisorAttendanceTableData>();
  return [
    supervisorAttendanceColumns().find((column) => column.id === "checkbox"),
    supervisorAttendanceColumns().find((column) => column.id === "name"),
    {
      id: "schoolName",
      accessorKey: "schoolName",
      header: "School",
    },
    supervisorAttendanceColumns().find((column) => column.id === "phoneNumber"),
    supervisorAttendanceColumns().find((column) => column.id === "fellows"),
    columnHelper.accessor("sessionType", {
      id: "sessionType",
      header: "Session",
      cell: (props) => {
        const value = props.getValue();
        const completed =
          props.row.original.occurred !== null
            ? props.row.original.occurred !== undefined
              ? props.row.original.occurred
              : false
            : false;
        const cancelled =
          props.row.original.sessionStatus === SessionStatus.Cancelled;

        return renderSessionTypeAndStatus(completed, cancelled, value);
      },
    }),
    supervisorAttendanceColumns().find((column) => column.id === "attendance"),
    supervisorAttendanceColumns().find((column) => column.id === "button"),
  ];
}

function getFellowAttendanceColumns() {
  const columnHelper = createColumnHelper<FellowAttendancesTableData>();
  return [
    {
      id: "schoolName",
      accessorKey: "schoolName",
      header: "School",
    },
    fellowAttendanceColumns().find((column) => column.id === "name"),
    fellowAttendanceColumns().find((column) => column.id === "cellNumber"),
    {
      id: "supervisorName",
      accessorKey: "supervisorName",
      header: "Supervisor",
    },
    fellowAttendanceColumns().find((column) => column.id === "groupName"),
    columnHelper.accessor("sessionType", {
      id: "sessionType",
      header: "Session",
      cell: (props) => {
        const value = props.getValue();
        const completed =
          props.row.original.occurred !== null
            ? props.row.original.occurred !== undefined
              ? props.row.original.occurred
              : false
            : false;
        const cancelled =
          props.row.original.sessionStatus === SessionStatus.Cancelled;
        return renderSessionTypeAndStatus(completed, cancelled, value);
      },
    }),
    fellowAttendanceColumns().find((column) => column.id === "attendance"),
  ];
}

const renderSessionTypeAndStatus = (
  completed: boolean,
  cancelled: boolean,
  value: string | undefined,
) => {
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "select-none rounded-[0.25rem] border px-1.5 py-0.5",
          {
            "border-green-border": completed,
            "border-blue-border": !completed,
            "border-red-border": cancelled,
          },
          {
            "bg-green-bg": completed,
            "bg-blue-bg": !completed,
            "bg-red-bg": cancelled,
          },
        )}
      >
        <div
          className={cn("text-[0.825rem] font-semibold", {
            "text-green-base": completed,
            "text-blue-base": !completed,
            "text-red-base": cancelled,
          })}
        >
          <div className="flex items-center gap-1">
            {completed && !cancelled && (
              <div className="flex items-center gap-1">
                <Icons.checkCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">
                  {value && sessionDisplayName(value)}
                </span>
              </div>
            )}
            {!completed && !cancelled && (
              <div className="flex items-center gap-1">
                <Icons.helpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">
                  {value && sessionDisplayName(value)}
                </span>
              </div>
            )}
            {cancelled && (
              <div className="flex items-center gap-1">
                <Icons.crossCircleFilled
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                />
                <span className="uppercase">
                  {value && sessionDisplayName(value)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

async function getSupervisorAttendances(
  hubId: string,
  selectedDay: CalendarDate,
  state: CalendarState,
  setSupervisorAttendances: Dispatch<
    SetStateAction<SupervisorAttendanceTableData[]>
  >,
  filters: Filters,
) {
  const attendances = await fetchSupervisorAttendances({
    where: {
      school: {
        hubId: hubId,
      },
      session: {
        sessionDate: {
          gte: selectedDay.toDate(state.timeZone),
          lt: addDays(selectedDay.toDate(state.timeZone), 1),
        },
        sessionType: {
          in: Object.keys(filters.sessionTypes).filter((sessionType) => {
            return filters.sessionTypes[sessionType];
          }),
        },
        status: {
          in: Object.keys(filters.statusTypes).filter((status) => {
            return filters.statusTypes[status];
          }) as SessionStatus[],
        },
      },
    },
  });
  const tableData = attendances.map((attendance) => {
    const totalAttendedFellows = attendance.supervisor.fellows.filter(
      (fellow) => {
        const attended = fellow.fellowAttendances.find(
          (attendance) => attendance.sessionId === hubId, //change this
        );
        if (attended) {
          return fellow;
        }
      },
    );
    return {
      id: attendance.id,
      supervisorId: attendance.supervisor.id,
      supervisorName: attendance.supervisor.supervisorName ?? "",
      schoolName: attendance.school.schoolName,
      attendance: attendance.attended,
      phoneNumber: attendance.supervisor.cellNumber ?? "",
      fellows:
        totalAttendedFellows.length +
        "/" +
        attendance.supervisor.fellows.length,
      sessionType: attendance.session.sessionType,
      sessionDate: attendance.session.sessionDate,
      sessionStatus: attendance.session.status,
      occurred: attendance.session.occurred,
    };
  });
  setSupervisorAttendances(tableData);
}

async function getFellowAttendances(
  hubId: string,
  selectedDay: CalendarDate,
  state: CalendarState,
  setFellowAttendances: Dispatch<SetStateAction<FellowAttendancesTableData[]>>,
  filters: Filters,
  sessions: Session[],
) {
  const start = selectedDay.toDate(state.timeZone);
  const end = addDays(selectedDay.toDate(state.timeZone), 1);
  const attendances = await fetchDayFellowAttendances({
    hubId,
    start,
    end,
    filters,
  });
  const fellows = await fetchFellowsWithSupervisor({
    where: {
      hubId,
    },
  });
  const _sessions = sessions.filter((session) => {
    return isWithinInterval(session.sessionDate, { start, end });
  });

  const tableData: FellowAttendancesTableData[] = [];
  _sessions.forEach((session) => {
    const sessionTypes = Object.keys(filters.sessionTypes).filter((key) => {
      return filters.sessionTypes[key];
    });
    const statusTypes = Object.keys(filters.statusTypes).filter((key) => {
      return filters.statusTypes[key];
    });
    if (
      session.status !== null &&
      statusTypes.includes(session.status) &&
      sessionTypes.includes(session.sessionType)
    ) {
      fellows.forEach((fellow) => {
        const matchingAttendance = attendances.find((attendance) => {
          return (
            attendance.sessionId === session.id &&
            attendance.fellowId === fellow.id
          );
        });
        if (matchingAttendance) {
          tableData.push(matchingAttendance);
        } else {
          tableData.push({
            schoolName: session.school.schoolName,
            fellowId: fellow.id,
            fellowName: fellow.fellowName,
            attended: null,
            averageRating: null,
            sessionId: session.id,
            groupName: null,
            supervisorId: fellow.supervisorId,
            supervisorName: fellow.supervisor?.supervisorName,
            cellNumber: fellow.cellNumber,
            sessionType: session.sessionType,
            occurred: session.occurred,
            sessionStatus: session.status,
            sessionDate: session.sessionDate,
          });
        }
      });
    }
  });
  setFellowAttendances(tableData);
}

export function TableView({
  state,
  hubId,
}: {
  state: CalendarState;
  hubId: string;
}) {
  const [selectedDay, setSelectedDay] = useState<CalendarDate>(state.value);
  const weekDays = state.getDatesInWeek(0);
  const { setTitle } = useTitle();
  const dayFormatter = useDateFormatter({
    weekday: "long",
  });
  const dateFormatter = useDateFormatter({
    dateStyle: "long",
    calendar: state.visibleRange.start.calendar.identifier,
  });
  const [supervisorAttendances, setSupervisorAttendances] = useState<
    SupervisorAttendanceTableData[]
  >([]);
  const [fellowAttendances, setFellowAttendances] = useState<
    FellowAttendancesTableData[]
  >([]);
  const [roleToggle, setRoleToggle] = useState<Role>("supervisors");
  const { filters } = useContext(FiltersContext);
  const { sessions } = useContext(SessionsContext);

  useEffect(() => {
    try {
      if (roleToggle === "supervisors") {
        getSupervisorAttendances(
          hubId,
          selectedDay,
          state,
          setSupervisorAttendances,
          filters,
        );
      } else {
        getFellowAttendances(
          hubId,
          selectedDay,
          state,
          setFellowAttendances,
          filters,
          sessions,
        );
      }
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Fetch failed!",
        description:
          "Something went wrong while fetching attendance data, please try again.",
      });
    }
  }, [hubId, selectedDay, roleToggle, filters, sessions]);

  useEffect(() => {
    setTitle(
      dateFormatter.formatRange(
        state.visibleRange.start.toDate(state.timeZone),
        state.visibleRange.end.toDate(state.timeZone),
      ),
    );
  }, [
    state.visibleRange.start,
    state.visibleRange.end,
    dateFormatter,
    setTitle,
    state.timeZone,
  ]);

  useEffect(() => {
    if (isBefore(new Date(), state.visibleRange.start.toDate(state.timeZone))) {
      setSelectedDay(state.visibleRange.start);
    } else {
      setSelectedDay(getCalendarDate(new Date()));
    }
  }, [state.timeZone, state.visibleRange.start]);

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex">
        <ToggleGroup
          type="single"
          className="form-toggle"
          defaultValue={format(
            selectedDay.toDate(state.timeZone),
            "yyyy-MM-dd",
          )}
          value={format(selectedDay.toDate(state.timeZone), "yyyy-MM-dd")}
          onValueChange={(value) => {
            if (value) setSelectedDay(getCalendarDate(new Date(value)));
          }}
        >
          {weekDays.map((date, index) => {
            if (date !== null) {
              const day = dayFormatter.format(date.toDate(state.timeZone));
              return (
                <ToggleGroupItem
                  key={day}
                  value={format(date.toDate(state.timeZone), "yyyy-MM-dd")}
                  aria-label={"Select " + day}
                  className="form-toggle-button"
                >
                  {day}
                </ToggleGroupItem>
              );
            }
          })}
        </ToggleGroup>
      </div>
      <div className="flex">
        <ToggleGroup
          type="single"
          className="form-toggle"
          defaultValue={roleToggle}
          onValueChange={(value: Role) => {
            if (value) setRoleToggle(value);
          }}
        >
          <ToggleGroupItem
            value={"supervisors"}
            aria-label={"Select Supervisors"}
            className="form-toggle-button"
          >
            Supervisors
          </ToggleGroupItem>
          <ToggleGroupItem
            value={"fellows"}
            aria-label={"Select Fellows"}
            className="form-toggle-button"
          >
            Fellows
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {roleToggle === "supervisors" && (
        <SupervisorAttendanceDataTable
          columns={getSupervisorAttendanceColumns() as ColumnDef<unknown>[]}
          data={supervisorAttendances}
          onChangeData={setSupervisorAttendances}
          emptyStateMessage={"No sessions scheduled on this day."}
        />
      )}
      {roleToggle === "fellows" && (
        <FellowAttendanceDataTable
          columns={getFellowAttendanceColumns() as ColumnDef<unknown>[]}
          data={fellowAttendances}
          editColumns={false}
          emptyStateMessage={"No sessions scheduled on this day."}
        />
      )}
    </div>
  );
}
