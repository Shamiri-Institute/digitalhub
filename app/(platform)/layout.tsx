import { getCurrentPersonnel } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const userSession = await getCurrentPersonnel();
  return (
    <LayoutClient
      session={userSession?.session ?? null}
      profile={userSession ?? null}
    >
      {children}
    </LayoutClient>
  );
}
