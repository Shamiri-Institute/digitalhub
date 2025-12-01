import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { currentFellow } from "#/app/auth";

export default async function FellowSchoolLayout({ children }: { children: ReactNode }) {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!fellow?.profile?.hubId) {
    return <div>Fellow has no assigned hub</div>;
  }

  return <div className="w-full self-stretch">{children}</div>;
}
