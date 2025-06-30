import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentSupervisor } from "#/app/auth";
import SchoolsDataProvider from "#/components/common/schools/schools-data-provider";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

export default async function SupervisorSchoolData({ children }: { children: ReactNode }) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  const data = await fetchSchoolData(supervisor?.hubId as string);
  return (
    <div className="w-full self-stretch">
      <SchoolsDataProvider schools={data}>{children}</SchoolsDataProvider>
    </div>
  );
}
