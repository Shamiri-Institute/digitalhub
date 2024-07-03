import {
  FellowAttendanceDataTable,
  FellowAttendancesTableData,
  columns as fellowAttendanceColumns,
} from "#/app/(platform)/hc/schedule/_components/fellow-attendance";
import {
  SupervisorAttendanceDataTable,
  SupervisorAttendanceTableData,
  columns as supervisorAttendanceColumns,
} from "#/app/(platform)/hc/schedule/_components/supervisor-attendance";
import { useTitle } from "#/app/(platform)/hc/schedule/_components/title-provider";
import { fetchDayFellowAttendances } from "#/app/(platform)/hc/schedule/actions/fellow-attendances";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { toast } from "#/components/ui/use-toast";
import { fetchFellowsWithSupervisor } from "#/lib/actions/fetch-fellows";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { fetchSupervisorAttendances } from "#/lib/actions/fetch-supervisors";
import { getCalendarDate } from "#/lib/date-utils";
import { CalendarDate } from "@internationalized/date";
import { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

type Role = "supervisors" | "fellows";

function getSupervisorAttendanceColumns() {
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
    supervisorAttendanceColumns().find((column) => column.id === "attendance"),
    supervisorAttendanceColumns().find((column) => column.id === "button"),
  ];
}

function getFellowAttendanceColumns() {
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
    fellowAttendanceColumns().find((column) => column.id === "attendance"),
  ];
}

async function getSupervisorAttendances(
  hubId: string,
  selectedDay: CalendarDate,
  state: CalendarState,
  setSupervisorAttendances: Dispatch<
    SetStateAction<SupervisorAttendanceTableData[]>
  >,
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
    };
  });
  setSupervisorAttendances(tableData);
}

async function getFellowAttendances(
  hubId: string,
  selectedDay: CalendarDate,
  state: CalendarState,
  setFellowAttendances: Dispatch<SetStateAction<FellowAttendancesTableData[]>>,
) {
  const start = selectedDay.toDate(state.timeZone);
  const end = addDays(selectedDay.toDate(state.timeZone), 1);
  const attendances = await fetchDayFellowAttendances({
    hubId,
    start,
    end,
  });
  const fellows = await fetchFellowsWithSupervisor({
    where: {
      hubId,
    },
  });
  const sessions = await fetchInterventionSessions({
    hubId,
    start,
    end,
  });

  const tableData: FellowAttendancesTableData[] = [];
  sessions.forEach((session) => {
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
        });
      }
    });
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

  useEffect(() => {
    try {
      if (roleToggle === "supervisors") {
        getSupervisorAttendances(
          hubId,
          selectedDay,
          state,
          setSupervisorAttendances,
        );
      } else {
        getFellowAttendances(hubId, selectedDay, state, setFellowAttendances);
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
  }, [hubId, selectedDay, roleToggle]);

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
