import { notFound } from "next/navigation";

import { currentAdminUser } from "#/app/auth";
import HubManagersTable from "../../components/hub-managers-table";
import { fetchAdminHub, fetchHubManagers } from "../../queries";

export default async function HubManagersPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const [hub, admin] = await Promise.all([fetchAdminHub(hubId), currentAdminUser()]);
  if (!hub) {
    notFound();
  }
  const managers = await fetchHubManagers(hub.id);

  return (
    <HubManagersTable
      managers={managers}
      hubId={hub.id}
      hubName={hub.hubName}
      canManage={admin?.profile.isSuperAdmin ?? false}
    />
  );
}
