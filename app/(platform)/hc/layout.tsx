import React from "react";

export default async function HubCoordinatorLayout({
  profileModal,
  children,
}: {
  children: React.ReactNode;
  profileModal: React.ReactNode;
}) {
  return (
    <div className="w-full self-stretch">
      {profileModal}
      {children}
    </div>
  );
}
