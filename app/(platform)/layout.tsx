import { getCurrentUser } from "#/app/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "#/app/api/auth/[...nextauth]/route";
import { LayoutClient } from "#/components/layout-client";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser();
  const session = await getServerSession(authOptions);

  return (
    <LayoutClient session={session} profile={profile}>
      {children}
    </LayoutClient>
  );
}
