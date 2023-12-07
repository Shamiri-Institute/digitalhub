"use client";

import { useQueryState } from "next-usequerystate";
import * as React from "react";

import { AttendancePieChart } from "#/app/(platform)/fellows/sessions/attendance-pie-chart";
import { FellowSwitcher } from "#/app/(platform)/fellows/sessions/fellow-switcher";
import { WeeklySessionsAttendedChart } from "#/app/(platform)/fellows/sessions/weekly-sessions-attended-chart";
import { CurrentSupervisor } from "#/app/auth";
import { fetchFellow } from "#/lib/actions/fetch-fellow";

export function SessionHistory({
  fellows,
}: {
  fellows: NonNullable<CurrentSupervisor>["fellows"];
}) {
  const [fellowId, setFellowId] = useQueryState("fid");
  const [fellow, setFellow] = React.useState<Awaited<
    ReturnType<typeof fetchFellow>
  > | null>(null);

  React.useEffect(() => {
    async function getFellow() {
      if (!fellowId) return;
      const fellow = await fetchFellow(fellowId);
      setFellow(fellow);
    }

    getFellow();
  }, [fellowId]);

  const presentCount =
    fellow?.fellowAttendances.filter((attendance) => attendance.attended)
      .length || 0;

  const absentCount =
    fellow?.fellowAttendances.filter((attendance) => !attendance.attended)
      .length || 0;

  return (
    <>
      <div className="flex justify-center">
        <div className="w-[min(300px,90vw)]">
          <FellowSwitcher
            fellowVisibleId={fellowId?.toLocaleUpperCase() ?? null}
            setFellowVisibleId={setFellowId}
            fellows={fellows}
          />
          <div className="mt-4 flex flex-col text-center text-sm">
            <div className="font-medium">MPESA</div>
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
          <div className="-ml-16 -mr-10 mt-16 h-96">
            <WeeklySessionsAttendedChart
              data={[
                {
                  week: "1st",
                  sessions: 2,
                },
                {
                  week: "2nd",
                  sessions: 2,
                },
                {
                  week: "3rd",
                  sessions: 3,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
