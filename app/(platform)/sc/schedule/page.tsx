import { signOut } from "next-auth/react";
import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentSupervisor } from "#/app/auth";
import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function SupervisorSchedulePage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const [schools, schoolStats, supervisors, fellowRatings, hubSessionTypes] = await Promise.all([
    await fetchSchoolData(supervisor?.profile.hubId as string),
    await db.$queryRaw<
      {
        session_count: number;
        clinical_case_count: number;
        fellow_count: number;
      }[]
    >`SELECT 
    h.id,
    COUNT(DISTINCT s.id) AS session_count,
    COUNT(DISTINCT c.id) AS clinical_case_count,
    COUNT(DISTINCT f.id) AS fellow_count
    FROM 
        hubs h
    JOIN 
        schools sch ON h.id = sch.hub_id
    LEFT JOIN 
        intervention_sessions s ON sch.id = s.school_id
    LEFT JOIN 
        students c ON sch.id = c.school_id AND c.is_clinical_case=TRUE
    LEFT JOIN 
        fellows f ON h.id = f.hub_id
        WHERE h.id=${supervisor?.profile.hubId}
    GROUP BY 
        h.id, h.hub_name`,
    await db.supervisor.findMany({
      where: {
        hubId: supervisor?.profile.hubId as string,
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
            groups: true,
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
    WHERE fel.hub_id=${supervisor?.profile.hubId}
    GROUP BY fel.id`,
    await db.sessionName.findMany({
      where: {
        hubId: supervisor?.profile.hubId as string,
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
              count: Number(schoolStats[0]?.session_count) || 0,
            },
            {
              title: "Fellows",
              count: Number(schoolStats[0]?.fellow_count) || 0,
            },
            {
              title: "Cases",
              count: Number(schoolStats[0]?.clinical_case_count) || 0,
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
