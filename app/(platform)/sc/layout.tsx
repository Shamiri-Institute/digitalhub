import React from "react";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full self-stretch">{children}</div>;
}
