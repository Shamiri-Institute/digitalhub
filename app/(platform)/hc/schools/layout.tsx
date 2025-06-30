import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentHubCoordinator } from "#/app/auth";
import SchoolsDataProvider from "#/components/common/schools/schools-data-provider";
import { signOut } from "next-auth/react";
import type React from "react";

export default async function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  if (!coordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const data = await fetchSchoolData(coordinator?.assignedHubId as string);
  return (
    <div className="w-full self-stretch">
      <SchoolsDataProvider schools={data}>{children}</SchoolsDataProvider>
    </div>
  );
}
