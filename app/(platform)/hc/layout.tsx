import React from "react";

export default async function HubCoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full self-stretch">{children}</div>;
}
