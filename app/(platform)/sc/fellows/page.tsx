import { redirect } from "next/navigation";

import { loadFellowsData } from "#/app/(platform)/sc/actions";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import FellowSchoolsDatatable from "../../../../components/common/fellow/fellow-schools-datatable";

export default async function FellowsPage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  const projectId = supervisor?.profile?.hub?.projectId;
  if (!projectId) {
    return <div>Supervisor&apos;s hub has no assigned project</div>;
  }

  const [fellows, project] = await Promise.all([
    loadFellowsData(),
    db.query.project.findFirst({ where: (p, { eq }) => eq(p.id, projectId) }),
  ]);

  return (
    <div className="px-6 py-5">
      <FellowSchoolsDatatable
        fellows={fellows}
        project={project ?? undefined}
        role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
      />
    </div>
  );
}
