import { notFound } from "next/navigation";

import { currentAdminUser } from "#/app/auth";
import HubSettingsForm from "../../components/hub-settings-form";
import HubSettingsView from "../../components/hub-settings-view";
import { fetchAdminHub, fetchHubSessionNames } from "../../queries";

export default async function HubSettingsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const [hub, admin] = await Promise.all([fetchAdminHub(hubId), currentAdminUser()]);
  if (!hub) {
    notFound();
  }
  const sessionNames = await fetchHubSessionNames(hub.id);

  if (!admin?.profile.isSuperAdmin) {
    return <HubSettingsView hubName={hub.hubName} sessionNames={sessionNames} />;
  }
  // A save changes these values, so the form remounts with them as its new defaults.
  const savedValuesKey = [
    hub.hubName,
    ...sessionNames.map((n) => `${n.id}:${n.sessionLabel}:${n.amount}`),
  ].join("|");
  return <HubSettingsForm key={savedValuesKey} hub={hub} sessionNames={sessionNames} />;
}
