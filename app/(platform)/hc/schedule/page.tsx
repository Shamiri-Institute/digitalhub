import { signOut } from "next-auth/react";
import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { getHubScheduleStats } from "#/lib/actions/hub";
import { db } from "#/lib/db";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  if (!coordinator?.profile?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const values = await Promise.all([
    await fetchSchoolData(coordinator?.profile?.assignedHubId as string),
    await getHubScheduleStats(coordinator?.profile?.assignedHubId as string),
    await db.supervisor.findMany({
      where: {
        hubId: coordinator?.profile?.assignedHubId as string,
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
    await db.$queryRaw<
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
    WHERE fel.hub_id=${coordinator?.profile?.assignedHubId}
    GROUP BY fel.id`,
    await db.sessionName.findMany({
      where: {
        hubId: coordinator?.profile?.assignedHubId as string,
      },
    }),
  ]);
  const schools = values[0];
  const schoolStats = values[1];
  const supervisors = values[2];
  const fellowRatings = values[3];
  const hubSessionTypes = values[4];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: schoolStats.sessionCount,
            },
            {
              title: "Fellows",
              count: schoolStats.fellowCount,
            },
            {
              title: "Cases",
              count: schoolStats.clinicalCaseCount,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={coordinator?.profile?.assignedHubId ?? ""}
          aria-label="Session schedule"
          schools={schools}
          supervisors={supervisors}
          fellowRatings={fellowRatings.map((rating) => ({
            ...rating,
            averageRating: Number(rating.averageRating),
          }))}
          role={coordinator?.session.user.activeMembership?.role ?? "HUB_COORDINATOR"}
          hubSessionTypes={hubSessionTypes}
        />
      </div>
      <PageFooter />
    </div>
  );
}
