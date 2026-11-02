import { notFound } from "next/navigation";

import FellowsTable from "#/app/(platform)/hc/fellows/components/fellows-table";
import { ImplementerRole } from "#/db/enums";
import { fetchAdminHub } from "../../queries";

export default async function HubFellowsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const hub = await fetchAdminHub(hubId);
  if (!hub) {
    notFound();
  }

  return (
    <FellowsTable
      hubId={hub.id}
      role={ImplementerRole.ADMIN}
      title="Fellows"
      description="Fellows lead the student groups. Ratings average their supervisors' weekly evaluations."
    />
  );
}
