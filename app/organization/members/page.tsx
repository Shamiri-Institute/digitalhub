import { Separator } from "#/components/ui/separator";

import { CardsDataTable } from "./members-table";

export default function OrganizationMembers() {
  return (
    <main>
      <div>
        <h1 className="font-medium text-2xl">Members</h1>
        <div className="text-sm py-2">
          Manage who has access to this organization
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
