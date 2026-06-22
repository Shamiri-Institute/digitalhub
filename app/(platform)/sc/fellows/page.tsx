import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { loadFellowsData } from "#/app/(platform)/sc/actions";
import { currentSupervisorLite } from "#/app/auth";
import { db } from "#/lib/db";
import FellowSchoolsDatatable from "../../../../components/common/fellow/fellow-schools-datatable";

export default async function FellowsPage() {
  const supervisor = await currentSupervisorLite();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  const fellows = await loadFellowsData();

  const projectId = supervisor?.profile?.hub?.projectId;
  if (!projectId) {
    return <div>Supervisor&apos;s hub has no assigned project</div>;
  }

  const project = await db.project.findUnique({
    where: {
      id: projectId,
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
