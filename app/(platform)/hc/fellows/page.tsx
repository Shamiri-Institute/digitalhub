import { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import MainFellowsDatatable from "#/app/(platform)/hc/fellows/components/main-fellows-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function FellowPage() {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }
  const fellows = await db.$queryRaw<MainFellowTableData[]>`
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
      GROUP BY
        f.id
  `;

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: hc?.assignedHubId as string,
    },
  });
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />
        {/* charts goes here */}
        <MainFellowsDatatable fellows={fellows} supervisors={supervisors} />
      </div>
      <PageFooter />
    </div>
  );
}
