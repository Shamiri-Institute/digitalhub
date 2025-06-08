import type { CalendarDate } from "@internationalized/date";
import { type ImplementerRole, type Prisma, SessionStatus } from "@prisma/client";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { addDays, format, isBefore, isWithinInterval } from "date-fns";
import { type Dispatch, type SetStateAction, useContext, useEffect, useState } from "react";
import { useDateFormatter } from "react-aria";
import type { CalendarState } from "react-stately";
import {
  SupervisorAttendanceDataTable,
  SupervisorAttendanceDataTableMenu,
  type SupervisorAttendanceTableData,
} from "#/app/(platform)/hc/components/supervisor-attendance";
import { FiltersContext } from "#/app/(platform)/hc/schedule/context/filters-context";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import {
  FellowAttendanceDataTable,
  type FellowAttendancesTableData,
} from "#/components/common/fellow/fellow-attendance";
import FellowAttendanceMenu from "#/components/common/fellow/fellow-attendance-menu";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { SessionsContext } from "#/components/common/session/sessions-provider";
import { useTitle } from "#/components/common/session/title-provider";
import { Icons } from "#/components/icons";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { getCalendarDate } from "#/lib/date-utils";
import { cn, sessionDisplayName } from "#/lib/utils";

type Role = "supervisors" | "fellows";

const supervisorAttendanceColumns = (state: {
  setAttendance: Dispatch<SetStateAction<SupervisorAttendanceTableData | undefined>>;
  setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
}): ColumnDef<SupervisorAttendanceTableData>[] => [
  {
    id: "schoolName",
    accessorKey: "schoolName",
    header: "School",
  },
  {
    id: "name",
    accessorKey: "supervisorName",
    header: "Name",
  },
  {
    cell: ({ row }) => {
      return RenderParsedPhoneNumber(row.original.phoneNumber ?? undefined);
    },
    header: "Phone number",
    id: "phoneNumber",
    accessorKey: "phoneNumber",
  },
  {
    accessorKey: "fellows",
    header: "No. of fellows",
    id: "fellows",
  },
  {
    cell: (props) => {
      const attended = props.getValue();
      return (
        <div className="flex">
          <div
            className={cn(
              "flex items-center rounded-[0.25rem] border px-1.5 py-0.5",
              {
                "border-green-border": attended,
                "border-red-border": !attended,
                "border-blue-border": attended === undefined || attended === null,
              },
              {
                "bg-green-bg": attended,
                "bg-red-bg": !attended,
                "bg-blue-bg": attended === undefined || attended === null,
              },
            )}
          >
            {attended === null || attended === undefined ? (
              <div className="flex items-center gap-1 text-blue-base">
                <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Not marked</span>
              </div>
            ) : attended ? (
              <div className="flex items-center gap-1 text-green-base">
                <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Attended</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-base">
                <Icons.crossCircleFilled className="h-3 w-3" strokeWidth={2.5} />
                <span>Missed</span>
              </div>
            )}
          </div>
        </div>
      );
    },
    header: "Attendance",
    id: "attendance",
    accessorKey: "attendance",
  },
  {
    id: "sessionType",
    accessorKey: "sessionType",
    header: "Session",
    cell: (props) => {
      const value = props.row.original.sessionType;
      const completed = props.row.original.occurred ?? false;
      const cancelled = props.row.original.sessionStatus === SessionStatus.Cancelled;
      const rescheduled = props.row.original.sessionStatus === SessionStatus.Rescheduled;

      return renderSessionTypeAndStatus(completed, cancelled, rescheduled, value);
    },
  },
  {
    cell: (props) => {
      return <SupervisorAttendanceDataTableMenu attendance={props.row.original} state={state} />;
    },
    id: "button",
    header: undefined,
    accessorKey: "attendance",
  },
];

const fellowAttendanceColumns = (state: {
  setAttendance: Dispatch<SetStateAction<FellowAttendancesTableData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
}): ColumnDef<FellowAttendancesTableData>[] => [
  {
    id: "schoolName",
    accessorKey: "schoolName",
    header: "School",
  },
  {
    id: "name",
    accessorKey: "fellowName",
    header: "Name",
  },
  {
    accessorKey: "cellNumber",
    id: "cellNumber",
    header: "Phone Number",
    cell: ({ row }) => {
      return RenderParsedPhoneNumber(row.original.cellNumber ?? undefined);
    },
  },
  {
    id: "supervisorName",
    accessorKey: "supervisorName",
    header: "Supervisor",
  },
  {
    accessorKey: "groupName",
    id: "groupName",
    header: "Group",
  },
  {
    id: "sessionType",
    header: "Session",
    cell: ({ row }) => {
      const value = row.original.sessionType;
      const completed =
        row.original.occurred !== null
          ? row.original.occurred !== undefined
            ? row.original.occurred
            : false
          : false;
      const cancelled = row.original.sessionStatus === SessionStatus.Cancelled;
      const rescheduled = row.original.sessionStatus === SessionStatus.Rescheduled;
      return renderSessionTypeAndStatus(completed, cancelled, rescheduled, value);
    },
    accessorKey: "sessionType",
  },
  {
    cell: ({ row }) => {
      const attended = row.original.attended;
      return (
        <div className="flex">
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
      <FellowAttendanceMenu
        state={state}
        attendance={row.original}
        disabled={!row.getCanSelect()}
      />
    ),
    enableHiding: false,
  },
];

const renderSessionTypeAndStatus = (
  completed: boolean,
  cancelled: boolean,
  rescheduled: boolean,
  value: string | undefined,
) => {
  return (
    <div className="flex">
      <div
        className={cn(
          "select-none rounded-[0.25rem] border px-1.5 py-0.5",
          {
            "border-green-border": completed,
            "border-blue-border": !completed,
            "border-red-border": cancelled,
            "border-shamiri-text-dark-grey/30": rescheduled,
          },
          {
            "bg-green-bg": completed,
            "bg-blue-bg": !completed,
            "bg-red-bg": cancelled,
            "bg-shamiri-light-grey/60": rescheduled,
          },
        )}
      >
        <div
          className={cn("text-[0.825rem] font-semibold", {
            "text-green-base": completed,
            "text-blue-base": !completed,
            "text-red-base": cancelled,
            "text-shamiri-text-dark-grey": rescheduled,
          })}
        >
          <div className="flex items-center gap-1">
            {completed && !cancelled && (
              <div className="flex items-center gap-1">
                <Icons.checkCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">{value && sessionDisplayName(value)}</span>
              </div>
            )}
            {!completed && !cancelled && !rescheduled && (
              <div className="flex items-center gap-1">
                <Icons.helpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">{value && sessionDisplayName(value)}</span>
              </div>
            )}
            {cancelled && (
              <div className="flex items-center gap-1">
                <Icons.crossCircleFilled className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">{value && sessionDisplayName(value)}</span>
              </div>
            )}
            {rescheduled && (
              <div className="flex items-center gap-1">
                <Icons.calendarCheck2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="uppercase">{value && sessionDisplayName(value)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export function TableView({
  state,
  supervisors,
  role,
  supervisorId,
}: {
  state: CalendarState;
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
  role: ImplementerRole;
  supervisorId?: string;
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
  const [fellowAttendances, setFellowAttendances] = useState<FellowAttendancesTableData[]>([]);
  const [roleToggle, setRoleToggle] = useState<Role>("supervisors");
  const { filters } = useContext(FiltersContext);
  const { sessions } = useContext(SessionsContext);

  useEffect(() => {
    const start = selectedDay.toDate(state.timeZone);
    const end = addDays(selectedDay.toDate(state.timeZone), 1);
    const activeSessions = sessions.filter((session) => {
      return isWithinInterval(session.sessionDate, { start, end });
    });
    const _fellowAttendances: FellowAttendancesTableData[] = [];

    const attendances = activeSessions.map((session) => {
      // filter by sessionType
      if (filters.sessionTypes) {
        if (
          session.session?.sessionName !== undefined &&
          !Object.keys(filters.sessionTypes).includes(session.session?.sessionName)
        ) {
          return;
        }
      }
      // filter by session status
      if (filters.statusTypes) {
        if (session.status !== null && !Object.keys(filters.statusTypes).includes(session.status)) {
          return;
        }
      }
      return supervisors?.map((supervisor) => {
        const totalAttendedFellows = supervisor.fellows.filter((fellow) => {
          const attended = fellow.fellowAttendances.find(
            (attendance) => attendance.sessionId === session?.id,
          );
          if (attended) {
            return fellow;
          }
        });
        const attendance = supervisor.supervisorAttendances.find(
          (_attendance) => _attendance.sessionId === session?.id,
        );
        supervisor.fellows.filter((fellow) => {
          const group = fellow.groups.find((group) => group.schoolId === session.schoolId);
          if (group) {
            const fellow_attendance = fellow.fellowAttendances.find(
              (_attendance) => _attendance.sessionId === session.id,
            );

            _fellowAttendances.push({
              schoolName: session.school?.schoolName,
              fellowId: fellow.id,
              fellowName: fellow.fellowName,
              attended: fellow_attendance?.attended ?? null,
              averageRating: null,
              sessionId: session.id,
              groupName: group.groupName ?? null,
              groupType: group.groupType,
              supervisorId: fellow.supervisorId,
              supervisorName: supervisor.supervisorName,
              cellNumber: fellow.cellNumber,
              sessionType: session.session?.sessionName,
              occurred: session.occurred,
              sessionStatus: session.status,
              sessionDate: session.sessionDate,
              processedAt: fellow_attendance?.processedAt ?? null,
            });
          }
        });

        return {
          id: attendance?.id,
          supervisorId: supervisor.id,
          supervisorName: supervisor.supervisorName ?? "",
          pointSchools: supervisor.assignedSchools.map((school) => school.schoolName),
          attendance: attendance?.attended,
          phoneNumber: supervisor.cellNumber ?? "",
          fellows: `${totalAttendedFellows.length}/${supervisor.fellows.length}`,
          sessionId: session?.id,
          schoolId: attendance?.schoolId,
          absenceReason: attendance?.absenceReason ?? "",
          absenceComments: attendance?.absenceComments ?? "",
          schoolName: session.school?.schoolName,
          sessionType: session?.session?.sessionName,
          occurred: session?.occurred,
          sessionStatus: session?.status,
        };
      });
    });
    setSupervisorAttendances(attendances.filter((x) => x !== undefined).flat());
    setFellowAttendances(_fellowAttendances);
  }, [selectedDay, roleToggle, filters, sessions, supervisors, state]);

  useEffect(() => {
    setTitle(
      dateFormatter.formatRange(
        state.visibleRange.start.toDate(state.timeZone),
        state.visibleRange.end.toDate(state.timeZone),
      ),
    );
  }, [state.visibleRange.start, state.visibleRange.end, dateFormatter, setTitle, state.timeZone]);

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
          defaultValue={format(selectedDay.toDate(state.timeZone), "yyyy-MM-dd")}
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
                  aria-label={`Select ${day}`}
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
          overrideColumns={supervisorAttendanceColumns}
          data={supervisorAttendances}
          emptyStateMessage={"No sessions scheduled on this day."}
        />
      )}
      {roleToggle === "fellows" && (
        <FellowAttendanceDataTable
          overrideColumns={fellowAttendanceColumns}
          data={fellowAttendances}
          editColumns={true}
          emptyStateMessage={"No sessions scheduled on this day."}
          enableRowSelection={(row: Row<FellowAttendancesTableData>) => {
            return (
              !(
                row.original.sessionType === "INTERVENTION" && row.original.groupId === undefined
              ) &&
              row.original.groupType === "TREATMENT" &&
              (row.original.supervisorId === supervisorId || role === "HUB_COORDINATOR") &&
              !row.original.droppedOut &&
              row.original.processedAt === null
            );
          }}
        />
      )}
    </div>
  );
}
