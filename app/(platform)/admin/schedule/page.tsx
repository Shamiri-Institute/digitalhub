import { Separator } from "#/components/ui/separator";

import PageFooter from "#/components/ui/page-footer";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";
import { currentAdminUser } from "#/app/auth";
import { signOut } from "next-auth/react";
import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { db } from "#/lib/db";

export default async function AdminSchedulePage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const values = await Promise.all([
    await db.$queryRaw<
      {
        hub_count: number;
        school_count: number;
        student_count: number;
      }[]
    >`SELECT
      COUNT(DISTINCT h.id) AS hub_count,
      COUNT(DISTINCT sch.id) AS school_count,
      COUNT(DISTINCT stu.id) AS student_count
    FROM
      hubs h
      LEFT JOIN schools sch ON h.id = sch.hub_id
      LEFT JOIN students stu ON sch.id = stu.school_id
    WHERE
      h.implementer_id = ${admin!.user.membership.implementerId}`
  ]);
  const implementerStats = values[0][0] || { hub_count: 0, school_count: 0, student_count: 0 };
  console.log(implementerStats);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Hubs",
              count: implementerStats.hub_count,
            },
            {
              title: "Schools",
              count: implementerStats.school_count,
            },
            {
              title: "Students",
              count: implementerStats.student_count,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        {/* <ScheduleCalendar
          hubId={coordinator?.assignedHubId}
          aria-label="Session schedule"
          schools={[]}
          supervisors={[]}
          fellowRatings={[]}
          role={"ADMIN"}
          hubSessionTypes={[]}
        /> */}
      </div>
      <PageFooter />
    </div>
  );
}
