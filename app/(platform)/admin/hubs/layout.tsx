import { currentAdminUser } from "#/app/auth";
import { signOut } from "next-auth/react";
import React from "react";

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return <div className="w-full self-stretch">{children}</div>;
}
