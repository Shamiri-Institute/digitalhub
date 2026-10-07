import { signOut } from "next-auth/react";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import {
  fetchImplementerFellowRatings,
  fetchImplementerSessionTypes,
  fetchImplementerSupervisors,
} from "#/lib/actions/implementer";
import { AdminScheduleCalendar } from "../../../../components/common/session/admin-schedule-calendar";
import { AdminScheduleHeader } from "../../../../components/common/session/admin-schedule-header";

export default async function AdminSchedulePage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const [sessionTypes, supervisors, fellowRatings] = await Promise.all([
    fetchImplementerSessionTypes(),
    fetchImplementerSupervisors(),
    fetchImplementerFellowRatings(),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <AdminScheduleHeader adminUser={admin} />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <AdminScheduleCalendar
          adminUser={admin}
          hubSessionTypes={sessionTypes.data ?? []}
          supervisors={supervisors.data ?? []}
          fellowRatings={fellowRatings.data ?? []}
        />
      </div>
      <PageFooter />
    </div>
  );
}
