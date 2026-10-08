import { redirect } from "next/navigation";
import type React from "react";
import { currentAdminUser } from "#/app/auth";

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  return <div className="w-full self-stretch">{children}</div>;
}
