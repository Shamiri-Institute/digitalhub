import { signOut } from "next-auth/react";
import type React from "react";
import { currentFellow } from "#/app/auth";
import SchoolViewLayout from "#/components/common/schools/school-view-layout";

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ visibleId: string }>;
}) {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const { visibleId } = await props.params;
  return <SchoolViewLayout visibleId={visibleId}>{props.children}</SchoolViewLayout>;
}
