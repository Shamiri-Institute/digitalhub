import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { signOut } from "next-auth/react";
import HubsDataTable from "./components/hubs-datatable";

export default async function HubsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Hubs" />
        <Separator />
        <HubsDataTable />
      </div>
      <PageFooter />
    </div>
  );
}
