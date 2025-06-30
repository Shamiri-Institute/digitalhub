import AddSupervisorExpensesForm from "#/components/common/expenses/supervisor-expenses/add-expense";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import type { Prisma } from "@prisma/client";

export default async function AddSupervisorExpenseTrigger({
  supervisorsInHub,
}: {
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
}) {
  return (
    <div className="flex justify-end">
      <AddSupervisorExpensesForm supervisorsInHub={supervisorsInHub}>
        <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
          <Icons.plusCircle />
          Add expense
        </Button>
      </AddSupervisorExpensesForm>
    </div>
  );
}
