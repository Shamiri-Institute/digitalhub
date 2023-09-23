import { Breadcrumbs } from "#/components/breadcrumbs";
import { Separator } from "#/components/ui/separator";

import { CardsDataTable } from "./members-table";

export default function OrganizationMembers() {
  return (
    <main>
      <Breadcrumbs crumbs={["Settings", "Organization", "Members"]} />
      <div className="mt-4">
        <div className="text-base py-2">
          Manage who has access to this organization.
        </div>
        <Separator className="my-4" />
        <div>
          <CardsDataTable />
        </div>
      </div>
      <Separator />
    </main>
  );
}
