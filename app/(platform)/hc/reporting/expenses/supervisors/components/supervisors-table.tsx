"use client";
import DataTable from "#/components/data-table";

import type { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import SupervisorsFilterTab from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisor-filter";
import type { Prisma } from "@prisma/client";
import { columns } from "./columns";

export default function HCSupervisorsDataTable({
  supervisorExpenses,
  supervisorsInHub,
}: {
  supervisorExpenses: HubSupervisorExpensesType[];
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <SupervisorsFilterTab supervisorsInHub={supervisorsInHub} />
      <DataTable
        data={supervisorExpenses}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No supervisor expenses found"
      />
    </div>
  );
}
