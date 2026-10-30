import { redirect } from "next/navigation";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getActiveProjectId } from "#/lib/active-project-id";
import HubsDataTable from "./components/hubs-datatable";
import { fetchAdminHubs } from "./queries";

export default async function HubsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }

  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const hubs = implementerId != null ? await fetchAdminHubs(implementerId, projectId) : [];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Hubs" />
        <Separator />
        <HubsDataTable hubs={hubs} canManageHubs={admin.profile.isSuperAdmin} />
      </div>
      <PageFooter />
    </div>
  );
}
