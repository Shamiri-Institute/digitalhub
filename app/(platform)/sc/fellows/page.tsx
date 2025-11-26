import { signOut } from "next-auth/react";
import { loadFellowsData } from "#/app/(platform)/sc/actions";
import { currentSupervisor } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import FellowSchoolsDatatable from "../../../../components/common/fellow/fellow-schools-datatable";
import { ImplementerRole } from "@prisma/client";

export default async function FellowsPage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  const fellows = await loadFellowsData();

  const project = await db.project.findUnique({
    where: {
      id: CURRENT_PROJECT_ID,
    },
  });

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
