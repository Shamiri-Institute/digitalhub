import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { currentFellow } from "#/app/auth";
import SchoolInfoProvider from "#/components/common/schools/school-info-provider";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { redirect } from "next/navigation";

export default async function SchoolsPage() {
  const fellow = await currentFellow();

  if (!fellow) {
    redirect("/login");
  }

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
                  fellow?.groups.reduce(
                    (a, b) => a + b.school._count.interventionSessions,
                    0,
                  ) || 0,
              },
              { title: "Groups", count: fellow?.groups.length || 0 },
              {
                title: "Students",
                count:
                  fellow?.groups.reduce((a, b) => a + b._count.students, 0) ||
                  0,
              },
            ]}
          />
        </div>
        <Separator />
        {/*TODO: Add search and filter features*/}
        {/*<div className="flex items-center justify-between">*/}
        {/*  <div className="flex w-1/4 items-start gap-3">*/}
        {/*    <SearchCommand data={data} />*/}
        {/*    <SchoolsFilterToggle schools={data} />*/}
        {/*  </div>*/}
        {/*</div>*/}
        <SchoolInfoProvider>
          <SchoolsDatatable role={fellow.user.membership.role} />
        </SchoolInfoProvider>
      </div>
      <PageFooter />
    </div>
  );
}
