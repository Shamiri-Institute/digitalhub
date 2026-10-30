import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import EditHubButton from "../components/edit-hub-button";
import HubBreadcrumb from "../components/hub-breadcrumb";
import HubTabs from "../components/hub-tabs";
import { fetchAdminHub, fetchSiblingHubs } from "../queries";

export async function generateMetadata(props: {
  params: Promise<{ hubId: string }>;
}): Promise<Metadata> {
  const { hubId } = await props.params;
  const hub = await fetchAdminHub(hubId);
  return hub ? { title: hub.hubName } : {};
}

export default async function HubLayout(props: {
  children: React.ReactNode;
  params: Promise<{ hubId: string }>;
}) {
  const { hubId } = await props.params;
  const [hub, siblingHubs, admin] = await Promise.all([
    fetchAdminHub(hubId),
    fetchSiblingHubs(),
    currentAdminUser(),
  ]);
  if (!hub) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <HubBreadcrumb hubs={siblingHubs} currentHub={hub} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold leading-[48px] text-black">{hub.hubName}</h2>
            <p className="text-sm font-medium uppercase tracking-wide text-shamiri-text-dark-grey">
              {hub.project.name}
            </p>
          </div>
          {admin?.profile.isSuperAdmin && (
            <div className="shrink-0 self-start">
              <EditHubButton hub={hub} />
            </div>
          )}
        </div>
        <HubTabs hub={hub} />
        <Separator />
        {props.children}
      </div>
      <PageFooter />
    </div>
  );
}
