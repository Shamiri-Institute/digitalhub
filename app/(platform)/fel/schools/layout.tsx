import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentFellow } from "#/app/auth";
import SchoolsDataProvider from "#/components/common/schools/schools-data-provider";

export default async function FellowSchoolLayout({ children }: { children: ReactNode }) {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!fellow?.hubId) {
    return <div>Fellow has no assigned hub</div>;
  }

  const data = await fetchSchoolData(fellow?.hubId as string);
  return (
    <div className="w-full self-stretch">
      <SchoolsDataProvider schools={data}>{children}</SchoolsDataProvider>
    </div>
  );
}
