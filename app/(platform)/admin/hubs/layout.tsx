import { signOut } from "next-auth/react";
import type React from "react";
import { currentAdminUser } from "#/app/auth";

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return <div className="w-full self-stretch">{children}</div>;
}
