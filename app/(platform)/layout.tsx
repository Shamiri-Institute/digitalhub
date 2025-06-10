import { getCurrentPersonnel } from "#/app/auth";
import { Layout } from "#/components/layout";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentPersonnel();

  return <Layout profile={profile}>{children}</Layout>;
}
