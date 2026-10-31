import { notFound } from "next/navigation";

import HubManagersTable from "../../components/hub-managers-table";
import { fetchAdminHub, fetchHubManagers } from "../../queries";

export default async function HubManagersPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const hub = await fetchAdminHub(hubId);
  if (!hub) {
    notFound();
  }
  const managers = await fetchHubManagers(hub.id);

  return (
    <HubManagersTable
      managers={managers}
      description="Each one signs in to the hub dashboard with the same access. Archiving removes only their hub access; any other role they hold keeps working."
    />
  );
}
