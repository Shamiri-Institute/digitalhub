import React from "react";

export default async function FellowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full self-stretch bg-white">{children}</div>;
}
