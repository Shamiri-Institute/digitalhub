import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import SchoolsDataProvider from "#/app/(platform)/hc/schools/components/schools-data-provider";
import { currentHubCoordinator } from "#/app/auth";
import React from "react";

export default async function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hubCoordinator = await currentHubCoordinator();
  // TODO: convert this to Promise.all for concurrent fetch
  const data = await fetchSchoolData(hubCoordinator?.assignedHubId as string);
  return (
    <div className="w-full self-stretch">
      <SchoolsDataProvider schools={data}>{children}</SchoolsDataProvider>
    </div>
  );
}
