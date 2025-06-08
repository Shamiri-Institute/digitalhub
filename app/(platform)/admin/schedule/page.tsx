import { Separator } from "#/components/ui/separator";

import PageFooter from "#/components/ui/page-footer";
import { AdminScheduleHeader } from "../../../../components/common/session/admin-schedule-header";
import { AdminScheduleCalendar } from "../../../../components/common/session/admin-schedule-calendar";
import { currentAdminUser } from "#/app/auth";
import { signOut } from "next-auth/react";

export default async function AdminSchedulePage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <AdminScheduleHeader />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <AdminScheduleCalendar />
      </div>
      <PageFooter />
    </div>
  );
}
