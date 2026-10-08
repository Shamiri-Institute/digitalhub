import { redirect } from "next/navigation";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import AdminAccessDataTable from "./components/admin-access-datatable";
import { fetchImplementerAdmins } from "./queries";

export default async function AdminUsersPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  const { implementerId, isSuperAdmin } = admin.profile;
  if (!isSuperAdmin || implementerId === null) {
    redirect("/admin/schedule");
  }

  const admins = await fetchImplementerAdmins(implementerId);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="User Management" />
        <Separator />
        <AdminAccessDataTable admins={admins} />
      </div>
      <PageFooter />
    </div>
  );
}
