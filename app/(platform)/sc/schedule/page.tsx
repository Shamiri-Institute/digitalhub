import { signOut } from "next-auth/react";
import { currentSupervisorLite } from "#/app/auth";
import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function SupervisorSchedulePage() {
  const supervisor = await currentSupervisorLite();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const hubId = supervisor?.profile.hubId as string;

  const [
    schools,
    [sessionCount, clinicalCaseCount, fellowCount],
    supervisors,
    fellowRatings,
    hubSessionTypes,
  ] = await Promise.all([
    db.school.findMany({
      where: {
        hubId,
      },
    }),
    // Compute each hub stat as an independent, indexed count. Joining sessions,
    // clinical-case students and fellows in a single query (the previous raw SQL)
    // produced a cartesian fan-out that COUNT(DISTINCT) then had to de-duplicate.
    Promise.all([
      db.interventionSession.count({
        where: { school: { hubId } },
      }),
      db.student.count({
        where: { isClinicalCase: true, school: { hubId } },
      }),
      db.fellow.count({
        where: { hubId },
      }),
    ]),
    db.supervisor.findMany({
      where: {
        hubId,
      },
      include: {
        supervisorAttendances: {
          include: {
            session: true,
          },
        },
        fellows: {
          include: {
            fellowAttendances: true,
            groups: {
              include: {
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
        assignedSchools: true,
      },
    }),
    db.$queryRaw<
      {
        id: string;
        averageRating: number;
      }[]
    >`SELECT
    fel.id,
    (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
    FROM
    fellows fel
    LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
    WHERE fel.hub_id=${hubId}
    GROUP BY fel.id`,
    db.sessionName.findMany({
      where: {
        hubId,
      },
    }),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: sessionCount,
            },
            {
              title: "Fellows",
              count: fellowCount,
            },
            {
              title: "Cases",
              count: clinicalCaseCount,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={supervisor?.profile.hubId ?? ""}
          aria-label="Session schedule"
          schools={schools}
          supervisors={supervisors}
          fellowRatings={fellowRatings.map((rating) => ({
            ...rating,
            averageRating: Number(rating.averageRating),
          }))}
          role={supervisor?.session.user.activeMembership?.role ?? "SUPERVISOR"}
          supervisorId={supervisor?.profile.id}
          hubSessionTypes={hubSessionTypes}
        />
      </div>
      <PageFooter />
    </div>
  );
}
