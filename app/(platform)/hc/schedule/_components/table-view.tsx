import {
  columns,
  SupervisorAttendanceDataTable,
  SupervisorAttendanceTableData,
} from "#/app/(platform)/hc/schedule/_components/supervisor-attendance";
import { useTitle } from "#/app/(platform)/hc/schedule/_components/title-provider";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { toast } from "#/components/ui/use-toast";
import { fetchSupervisorAttendances } from "#/lib/actions/fetch-supervisors";
import { getCalendarDate } from "#/lib/date-utils";
import { CalendarDate } from "@internationalized/date";
import { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

type Role = "supervisors" | "fellows";

function getColumns() {
  return [
    columns().find((column) => column.id === "checkbox"),
    columns().find((column) => column.id === "name"),
    {
      id: "schoolName",
      accessorKey: "schoolName",
      header: "School",
    },
    columns().find((column) => column.id === "phoneNumber"),
    columns().find((column) => column.id === "fellows"),
    columns().find((column) => column.id === "attendance"),
    columns().find((column) => column.id === "button"),
  ];
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
  const [attendances, setAttendances] = useState<
    SupervisorAttendanceTableData[]
  >([]);
  const [roleToggle, setRoleToggle] = useState<Role>("supervisors");

  const activeColumns = useMemo(() => getColumns(), []);

  useEffect(() => {
    try {
      const fetchAttendances = async () => {
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
        console.log(attendances);
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
        setAttendances(tableData);
      };
      fetchAttendances();
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Fetch failed!",
        description:
          "Something went wrong while fetching supervisor data, please try again.",
      });
    }
  }, [hubId, selectedDay]);

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
      <SupervisorAttendanceDataTable
        columns={activeColumns as ColumnDef<unknown>[]}
        data={attendances}
        onChangeData={setAttendances}
        emptyStateMessage={"No sessions scheduled on this day."}
      />
    </div>
  );
}
