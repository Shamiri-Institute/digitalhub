import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import SchoolsDataProvider from "#/app/(platform)/hc/schools/components/schools-data-provider";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import React from "react";

export default async function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coordinator = await currentHubCoordinator();

  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const data = await fetchSchoolData(coordinator?.assignedHubId as string);
  return (
    <div className="w-full self-stretch">
      <SchoolsDataProvider schools={data}>{children}</SchoolsDataProvider>
    </div>
  );
}
