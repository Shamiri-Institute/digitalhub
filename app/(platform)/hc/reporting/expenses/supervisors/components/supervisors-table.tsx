"use client";

import type { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import SupervisorsFilterTab from "#/app/(platform)/hc/reporting/expenses/supervisors/components/supervisor-filter";
import DataTable from "#/components/data-table";
import { columns } from "./columns";
import type { supervisor } from "#/db/schema";

export default function HCSupervisorsDataTable({
  supervisorExpenses,
  supervisorsInHub,
}: {
  supervisorExpenses: HubSupervisorExpensesType[];
  supervisorsInHub: (typeof supervisor.$inferSelect)[];
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
