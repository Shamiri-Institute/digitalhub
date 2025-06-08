import {
  CurrentClinicalLead,
  CurrentFellow,
  CurrentHubCoordinator,
  CurrentOpsUser,
  CurrentSupervisor,
  CurrentUser,
  getCurrentPersonnel,
  getCurrentUser,
} from "#/app/auth";
import { Layout } from "#/components/layout";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentPersonnel();
  console.log("memberships", profile?.user.user.memberships);

  return <Layout profile={profile}>{children}</Layout>;
}
