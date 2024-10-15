import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { loadFellowsData } from "../actions";
import FellowsDataTable from "./components/fellows-data-table";

export default async function FellowsPage() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const fellows = await loadFellowsData();

  const weeklyFellowEvaluations = await db.weeklyFellowRatings.findMany({
    where: {
      fellow: {
        hubId: supervisor?.hubId as string,
      },
    },
  });

  const project = await db.project.findUnique({
    where: {
      id: CURRENT_PROJECT_ID,
    },
  });

  return (
    <div className="px-6 py-5">
      <FellowsDataTable
        fellows={fellows}
        weeklyEvaluations={weeklyFellowEvaluations}
        project={project ?? undefined}
      />
    </div>
  );
}
