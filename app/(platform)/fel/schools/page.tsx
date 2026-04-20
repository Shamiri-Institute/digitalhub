import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { currentFellowAuth } from "#/app/auth";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getFellowGroupsAndHubData } from "#/lib/data/fellow-data";

export default async function SchoolsPage() {
  const fellow = await currentFellowAuth();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const fellowData = await getFellowGroupsAndHubData(fellow?.profile.id ?? "");

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PageHeading title="Schools" />
          <CountWidget
            stats={[
              {
                title: "Sessions",
                count:
                  fellowData?.groups.reduce(
                    (a, b) => a + b.school._count.interventionSessions,
                    0,
                  ) || 0,
              },
              { title: "Groups", count: fellowData?.groups.length || 0 },
              {
                title: "Students",
                count: fellowData?.groups.reduce((a, b) => a + b._count.students, 0) || 0,
              },
            ]}
          />
        </div>
        <Separator />
        <SchoolsDatatable
          role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
          schools={fellowData?.hub?.schools ?? []}
        />
      </div>
      <PageFooter />
    </div>
  );
}
