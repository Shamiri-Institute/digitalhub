import { CurrentSupervisor, CurrentHubCoordinator, CurrentFellow, CurrentClinicalLead, CurrentOpsUser, CurrentUser, getCurrentPersonnel, getCurrentUser } from "#/app/auth";
import { Personnel } from "#/components/common/dev-personnel-switcher";
import { Layout } from "#/components/layout";
import { fetchImplementerPersonnel, ImplementerPersonnel } from "#/lib/actions/fetch-personnel";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile: CurrentUser | CurrentSupervisor | CurrentHubCoordinator | CurrentFellow | CurrentClinicalLead | CurrentOpsUser | null = null;
  let implementerMembers: ImplementerPersonnel | null = null;

  if(process.env.NODE_ENV === "development") {
    const user = await getCurrentUser();
    profile = await getCurrentPersonnel();
    implementerMembers = await fetchImplementerPersonnel();
    console.log(implementerMembers?.personnel.length);
  } else {
    profile = await getCurrentPersonnel();
  }

  return (
    <Layout profile={profile} implementerMembers={implementerMembers}>
      {children}
    </Layout>
  );
}
