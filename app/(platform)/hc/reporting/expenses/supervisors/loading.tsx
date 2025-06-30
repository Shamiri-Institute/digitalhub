"use client";

import type { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/expenses/supervisors/actions";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import { columns } from "./components/columns";

export default function SupervisorsTableSkeleton() {
  const loadingColumns: ColumnDef<HubSupervisorExpensesType>[] = columns.map(
    (column) => {
      const columnId =
        typeof column.header === "string"
          ? column.header
          : (column.id ?? "unknown");
      return {
        accessorFn: () => null,
        header:
          columnId !== "checkbox" && columnId !== "button" ? columnId : "",
        id: columnId,
        cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
      };
    },
  );

  const emptyData: HubSupervisorExpensesType[] = Array.from(
    Array(10).keys(),
  ).map(() => ({
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
        key="skeleton-fellows-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
