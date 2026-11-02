import { notFound } from "next/navigation";

import SupervisorsTable from "#/app/(platform)/hc/supervisors/components/supervisors-table";
import { ImplementerRole } from "#/db/enums";
import { getActiveProjectId } from "#/lib/active-project-id";
import { fetchAdminHub } from "../../queries";

export default async function HubSupervisorsPage({
  params,
}: {
  params: Promise<{ hubId: string }>;
}) {
  const { hubId } = await params;
  const [hub, activeProjectId] = await Promise.all([fetchAdminHub(hubId), getActiveProjectId()]);
  if (!hub) {
    notFound();
  }

  return (
    <SupervisorsTable
      hubId={hub.id}
      projectId={activeProjectId}
      role={ImplementerRole.ADMIN}
      title="Supervisors"
      description="Each supervisor oversees a team of fellows and is the point supervisor for their assigned schools."
    />
  );
}
