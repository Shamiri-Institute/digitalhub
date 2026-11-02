import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type React from "react";

import PageFooter from "#/components/ui/page-footer";
import HubBreadcrumb from "../components/hub-breadcrumb";
import HubStats from "../components/hub-stats";
import HubTabs from "../components/hub-tabs";
import { fetchAdminHub, fetchHubStats, fetchSiblingHubs } from "../queries";

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
  const [hub, siblingHubs, stats] = await Promise.all([
    fetchAdminHub(hubId),
    fetchSiblingHubs(),
    fetchHubStats(hubId),
  ]);
  if (!hub) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <HubBreadcrumb hubs={siblingHubs} currentHub={hub} />
        <div className="space-y-2">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold leading-[48px] text-black">{hub.hubName}</h2>
            <p className="text-sm font-medium uppercase tracking-wide text-shamiri-text-dark-grey">
              {hub.project.name}
            </p>
          </div>
          <HubStats stats={stats} />
        </div>
        <HubTabs hub={hub} />
        {props.children}
      </div>
      <PageFooter />
    </div>
  );
}
