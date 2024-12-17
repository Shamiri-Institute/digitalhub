"use client";
import { SupervisorExpensesType } from "#/app/(platform)/sc/reporting/expenses/my-expenses/actions";
import DataTable from "#/components/data-table";

import { columns } from "./columns";

export default function SupervisorExpensesDataTable({
  supervisorExpenses,
}: {
  supervisorExpenses: SupervisorExpensesType[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <DataTable
        data={supervisorExpenses}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No supervisor expenses found"
      />
    </div>
  );
}
