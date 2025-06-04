import { Separator } from "#/components/ui/separator";

import PageFooter from "#/components/ui/page-footer";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  // const coordinator = await currentHubCoordinator();
  // if (coordinator === null) {
  //   await signOut({ callbackUrl: "/login" });
  // }
  // if (!coordinator?.assignedHubId) {
  //   return <div>Hub coordinator has no assigned hub</div>;
  // }
  const coordinator: any = undefined;

  // const user = await getCurrentUser();

  // const values = await Promise.all([
  //   await fetchSchoolData(coordinator?.assignedHubId as string),
  //   await db.$queryRaw<
  //     {
  //       session_count: number;
  //       clinical_case_count: number;
  //       fellow_count: number;
  //     }[]
  //   >`SELECT
  //   h.id,
  //   COUNT(DISTINCT s.id) AS session_count,
  //   COUNT(DISTINCT c.id) AS clinical_case_count,
  //   COUNT(DISTINCT f.id) AS fellow_count
  //   FROM
  //       hubs h
  //   JOIN
  //       schools sch ON h.id = sch.hub_id
  //   LEFT JOIN
  //       intervention_sessions s ON sch.id = s.school_id
  //   LEFT JOIN
  //       students c ON sch.id = c.school_id AND c.is_clinical_case=TRUE
  //   LEFT JOIN
  //       fellows f ON h.id = f.hub_id
  //       WHERE h.id=${coordinator!.assignedHubId}
  //   GROUP BY
  //       h.id, h.hub_name`,
  //   await db.supervisor.findMany({
  //     where: {
  //       hubId: coordinator?.assignedHubId as string,
  //     },
  //     include: {
  //       supervisorAttendances: {
  //         include: {
  //           session: true,
  //         },
  //       },
  //       fellows: {
  //         include: {
  //           fellowAttendances: true,
  //           groups: true,
  //         },
  //       },
  //       assignedSchools: true,
  //     },
  //   }),
  //   await db.$queryRaw<
  //     {
  //       id: string;
  //       averageRating: number;
  //     }[]
  //   >`SELECT
  //   fel.id,
  //   (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
  //   FROM
  //   fellows fel
  //   LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
  //   WHERE fel.hub_id=${coordinator!.assignedHubId}
  //   GROUP BY fel.id`,
  //   await db.sessionName.findMany({
  //     where: {
  //       hubId: coordinator!.assignedHubId as string,
  //     },
  //   }),
  // ]);
  // const schools = values[0];
  // const schoolStats = values[1];
  // const supervisors = values[2];
  // const fellowRatings = values[3];
  // const hubSessionTypes = values[4];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: 0,
            },
            {
              title: "Fellows",
              count: 0,
            },
            {
              title: "Cases",
              count: 0,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={coordinator?.assignedHubId}
          aria-label="Session schedule"
          schools={[]}
          supervisors={[]}
          fellowRatings={[]}
          role={"ADMIN"}
          hubSessionTypes={[]}
        />
      </div>
      <PageFooter />
    </div>
  );
}
