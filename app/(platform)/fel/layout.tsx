import React from "react";

export default async function FellowLayout({
  profileModal,
  children,
}: {
  children: React.ReactNode;
  profileModal: React.ReactNode;
}) {
  return (
    <div className="w-full self-stretch bg-white">
      {profileModal}
      {children}
    </div>
  );
}
