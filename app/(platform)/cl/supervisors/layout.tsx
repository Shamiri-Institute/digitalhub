import PageFooter from "#/components/ui/page-footer";
import React from "react";

export default async function SupervisorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full self-stretch">
      <div className="container w-full grow bg-white py-10">{children}</div>
      <PageFooter />
    </div>
  );
}
