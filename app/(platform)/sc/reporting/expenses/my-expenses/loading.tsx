"use client";

import type { SupervisorExpensesType } from "#/app/(platform)/sc/reporting/expenses/my-expenses/actions";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import { columns } from "./components/columns";

export default function SupervisorsTableSkeleton() {
  const loadingColumns: ColumnDef<SupervisorExpensesType>[] = columns.map((column) => {
    const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
    return {
      accessorFn: () => null,
      header: columnId !== "checkbox" && columnId !== "button" ? columnId : "",
      id: columnId,
      cell: () => {
        return columnId !== "checkbox" && columnId !== "button" ? (
          <Skeleton className="h-5 w-full bg-gray-200" />
        ) : null;
      },
    };
  });

  const emptyData: SupervisorExpensesType[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
    supervisorName: "",
    dateCreated: new Date(),
    dateOfExpense: new Date(),
    typeOfExpense: "",
    session: "",
    destination: "",
    amount: 0,
    status: "",
    mpesaNumber: "",
    mpesaName: "",
    hubCoordinatorName: "",
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-supervisor-expenses-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
