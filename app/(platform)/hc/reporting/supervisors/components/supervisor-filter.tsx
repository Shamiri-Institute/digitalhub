import AddSupervisorExpensesForm from "#/app/(platform)/hc/reporting/supervisors/components/add-expense";
import SupervisorFilterToggle from "#/app/(platform)/hc/reporting/supervisors/components/supervisor-expense-toggle";
import { Icons } from "#/components/icons";
import { SearchCommand } from "#/components/search-command";
import { Button } from "#/components/ui/button";
import { Prisma } from "@prisma/client";

export default async function SupervisorsFilterTab({
  hubCoordinatorId,
  hubId,
  supervisorsInHub,
}: {
  hubCoordinatorId: string;
  hubId: string;
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex w-1/4 gap-3">
        <SearchCommand data={[]} />
        <SupervisorFilterToggle supervisors={[]} />
      </div>
      <div>
        <AddSupervisorExpensesForm supervisorsInHub={supervisorsInHub}>
          <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
            <Icons.plusCircle />
            Add expense
          </Button>
        </AddSupervisorExpensesForm>
      </div>
    </div>
  );
}
