"use client";

import { Prisma } from "@prisma/client";

import { AttendancePieChart } from "#/app/(platform)/fellows/sessions/attendance-pie-chart";
import { FellowAttendanceTable } from "#/app/(platform)/fellows/sessions/fellow-attendance-table";
import { FellowSwitcher } from "#/app/(platform)/fellows/sessions/fellow-switcher";
import { WeeklySessionsAttendedChart } from "#/app/(platform)/fellows/sessions/weekly-sessions-attended-chart";
import { CurrentSupervisor } from "#/app/auth";
import { ordinalSuffixOf } from "#/lib/utils";

export function SessionHistory({
  fellow,
  fellows,
  sessionsAttended,
}: {
  fellow: Prisma.FellowGetPayload<{ include: { fellowAttendances: true } }>;
  fellows: NonNullable<CurrentSupervisor>["fellows"];
  sessionsAttended: Prisma.FellowAttendanceGetPayload<{
    include: { school: true };
  }>[];
}) {
  const presentCount =
    fellow.fellowAttendances.filter((attendance) => attendance.attended)
      .length || 0;

  const absentCount =
    fellow.fellowAttendances.filter((attendance) => !attendance.attended)
      .length || 0;

  function processAttendanceData(data: typeof sessionsAttended) {
    let attendanceData = [];
    for (let i = 0; i <= 4; i++) {
      const weekSessions = data.filter(
        (d) => d.sessionNumber === i && d.fellowId === fellow?.id,
      );
      attendanceData.push({
        week: `${ordinalSuffixOf(i + 1)}`,
        sessions: weekSessions.length,
      });
    }
    return attendanceData;
  }

  const attendanceData = processAttendanceData(sessionsAttended);

  return (
    <>
      <div className="flex justify-center">
        <div className="w-[min(350px,90vw)]">
          <FellowSwitcher
            fellowVisibleId={fellow.visibleId.toLocaleUpperCase() ?? null}
            setFellowVisibleId={(visibleId) => {
              const fellow = fellows.find(
                (fellow) => fellow.visibleId === visibleId,
              );
              if (fellow) {
                window.location.href = `/fellows/sessions?fid=${fellow.visibleId}`;
              }
            }}
            fellows={fellows}
          />
          <div className="mt-4 flex flex-col text-center text-sm">
            <div className="font-medium">MPESA Number</div>
            <div className="h-[28px] text-xl font-semibold">
              {fellow?.mpesaNumber ?? "N/A"}
            </div>
          </div>
          <div>
            <AttendancePieChart
              presentCount={presentCount}
              absentCount={absentCount}
            />
            <div className="text-center text-sm text-zinc-400">
              Total Sessions
            </div>
          </div>
          <div className="-ml-16 -mr-8 mt-16 h-72">
            <WeeklySessionsAttendedChart data={attendanceData} />
          </div>
          <div>
            <FellowAttendanceTable attendance={sessionsAttended} />
          </div>
        </div>
      </div>
    </>
  );
}
