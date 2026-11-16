import { redirect } from "next/navigation";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { getActiveProjectId } from "#/lib/active-project-id";
import HubsDataTable from "./components/hubs-datatable";
import ProjectStats from "./components/project-stats";
import { fetchAdminHubs } from "./queries";

export default async function HubsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }

  const implementerId = admin?.session?.user.activeMembership?.implementerId;
  const projectId = await getActiveProjectId();

  const [hubs, activeProject] = await Promise.all([
    implementerId != null ? fetchAdminHubs(implementerId, projectId) : [],
    db.query.project.findFirst({
      where: (p, { eq }) => eq(p.id, projectId),
      columns: { name: true },
    }),
  ]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Hubs" />
        <div className="space-y-2">
          {activeProject && (
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {activeProject.name}
            </p>
          )}
          <ProjectStats hubs={hubs} />
        </div>
        <HubsDataTable hubs={hubs} canManageHubs={admin.profile.isSuperAdmin} />
      </div>
      <PageFooter />
    </div>
  );
}
