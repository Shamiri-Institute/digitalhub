import React from "react";

export default async function SupervisorLayout({
  profileModal,
  children,
}: {
  children: React.ReactNode;
  profileModal: React.ReactNode;
}) {
  return (
    <div className="w-full self-stretch bg-white">
      THis is just a test of the profile {profileModal}
      {children}
    </div>
  );
}
