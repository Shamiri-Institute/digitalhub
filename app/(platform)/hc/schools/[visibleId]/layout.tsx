import { redirect } from "next/navigation";
import type React from "react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolViewLayout from "#/components/common/schools/school-view-layout";

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ visibleId: string }>;
}) {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }
  const assignedHubId = hubCoordinator?.profile?.assignedHubId;
  if (!assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  const { visibleId } = await props.params;
  return <SchoolViewLayout visibleId={visibleId}>{props.children}</SchoolViewLayout>;
}
