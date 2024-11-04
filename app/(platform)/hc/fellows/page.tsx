import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import FellowsChartsWrapper from "#/app/(platform)/hc/fellows/components/fellows-charts-wrapper";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { Suspense } from "react";

export default async function FellowPage() {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }
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
        f.dropped_out AS "droppedOut",
        COUNT(ig.*) AS "groupCount",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
      FROM
        fellows f
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
          LEFT JOIN (
          SELECT
            _ig.*
          FROM
            intervention_groups _ig) ig ON f.id = ig.leader_id
      WHERE f.hub_id =${hc.assignedHubId}
      GROUP BY
        f.id
  `,
    await db.fellowComplaints.findMany({
      where: {
        fellow: {
          hubId: hc.assignedHubId,
        },
      },
      include: {
        supervisor: true,
      },
    }),
  ]).then((values) => {
    return values[0].map((fellow) => {
      return {
        ...fellow,
        complaints: values[1].filter((_complaints) => {
          return _complaints.fellowId === fellow.id;
        }),
      };
    });
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: hc?.assignedHubId as string,
    },
  });

  const weeklyFellowEvaluations = await db.weeklyFellowRatings.findMany({
    where: {
      fellow: {
        hubId: hc?.assignedHubId as string,
      },
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />

        <Suspense fallback={<GraphLoadingIndicator />}>
          <FellowsChartsWrapper coordinator={hc} />
        </Suspense>
        <MainFellowsDatatable
          fellows={data}
          supervisors={supervisors}
          weeklyEvaluations={weeklyFellowEvaluations}
        />
      </div>
      <PageFooter />
    </div>
  );
}
