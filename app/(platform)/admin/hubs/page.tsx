import { signOut } from "next-auth/react";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { ImplementerRole } from "#/db/enums";
import { getActiveProjectId } from "#/lib/active-project-id";
import HubsDataTable from "./components/hubs-datatable";
import { fetchAdminHubs } from "./queries";

export default async function HubsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();
  const role = admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN;

  const hubs = implementerId != null ? await fetchAdminHubs(implementerId, projectId) : [];

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Hubs" />
        <Separator />
        <HubsDataTable hubs={hubs} role={role} />
      </div>
      <PageFooter />
    </div>
  );
}
