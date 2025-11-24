import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import { ImplementerRole } from "@prisma/client";

export default async function FellowPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    await signOut({ callbackUrl: "/login" });
  }
  const activeMembership = admin?.session?.user.activeMembership;
  const data = await Promise.all([
    await db.$queryRaw<Omit<MainFellowTableData, "complaints">[]>`
      SELECT
        f.id,
        f.fellow_name AS "fellowName",
        f.fellow_email AS "fellowEmail",
        f.gender AS "gender",
        f.date_of_birth AS "dateOfBirth",
        f.id_number AS "idNumber",
        f.county AS "county",
        f.sub_county AS "subCounty",
        f.mpesa_name AS "mpesaName",
        f.mpesa_number AS "mpesaNumber",
        f.cell_number AS "cellNumber",
        f.supervisor_id AS "supervisorId",
        f.date_of_birth as "dateOfBirth",
        f.id_number as "idNumber",
        f.dropped_out AS "droppedOut",
        COUNT(DISTINCT ig.id) AS "groupCount",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
      FROM
        fellows f
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
          LEFT JOIN intervention_groups ig ON f.id = ig.leader_id
      WHERE f.implementer_id =${activeMembership?.implementerId}
      GROUP BY
        f.id
  `,
    await db.fellowComplaints.findMany({
      where: {
        fellow: {
          implementerId: activeMembership?.implementerId,
        },
      },
      include: {
        user: true,
      },
    }),
    await db.interventionGroup.findMany({
      where: {
        leader: {
          implementerId: activeMembership?.implementerId,
        },
      },
      include: {
        school: true,
      },
    }),
  ]).then((values) => {
    return values[0].map((fellow) => {
      return {
        ...fellow,
        complaints: values[1].filter((_complaints) => {
          return _complaints.fellowId === fellow.id;
        }),
        groups: values[2].filter((_groups) => {
          return _groups.leaderId === fellow.id;
        }),
      };
    });
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      implementerId: activeMembership?.implementerId,
    },
    include: {
      fellows: true,
    },
  });

  const weeklyFellowEvaluations = await db.weeklyFellowRatings.findMany({
    where: {
      fellow: {
        implementerId: activeMembership?.implementerId,
      },
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />
        <MainFellowsDatatable
          fellows={data}
          supervisors={supervisors}
          weeklyEvaluations={weeklyFellowEvaluations}
          role={activeMembership?.role ?? ImplementerRole.ADMIN}
        />
      </div>
      <PageFooter />
    </div>
  );
}
