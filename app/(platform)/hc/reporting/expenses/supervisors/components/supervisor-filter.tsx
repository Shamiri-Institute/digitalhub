import type { Supervisor } from "@prisma/client";
import SupervisorFilterToggle from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisor-expense-toggle";
import AddSupervisorExpensesForm from "#/components/common/expenses/supervisor-expenses/add-expense";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";

export default async function SupervisorExpensesFilterTab({
  supervisorsInHub,
}: {
  supervisorsInHub: Supervisor[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex w-1/4 gap-3">
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
