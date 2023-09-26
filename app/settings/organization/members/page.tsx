import { Breadcrumbs } from "#/components/breadcrumbs";
import { Separator } from "#/components/ui/separator";

import { MembersTable } from "./members-table";

export default function OrganizationMembers() {
  return (
    <main className="mt-10 md:mt-0">
      <Breadcrumbs crumbs={["Settings", "Organization", "Members"]} />
      <div className="md:mt-4">
        <div className="text-sm md:text-base text-muted-foreground py-2">
          Manage who is a member of this organization.
        </div>
        <Separator className="my-4" />
        <div>
          <MembersTable />
        </div>
      </div>
    </main>
  );
}
