"use client";
import DataTable from "#/components/data-table";

import { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/supervisors/actions";
import SupervisorsFilterTab from "#/app/(platform)/hc/reporting/supervisors/components/supervisor-filter";
import { Prisma } from "@prisma/client";
import { columns } from "./columns";

export default function HCSupervisorsDataTable({
  supervisorExpenses,
  currentHubCoordinator,
  supervisorsInHub,
}: {
  supervisorExpenses: HubSupervisorExpensesType[];
  currentHubCoordinator: Prisma.HubCoordinatorGetPayload<{}>;
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
}) {
  return (
    <div className="container w-full grow space-y-3">
      <SupervisorsFilterTab
        hubCoordinatorId={currentHubCoordinator.id}
        hubId={currentHubCoordinator.assignedHubId!}
        supervisorsInHub={supervisorsInHub}
      />
      <DataTable
        data={supervisorExpenses}
        columns={columns}
        className="data-table data-table-action mt-4 bg-white"
        emptyStateMessage="No supervisor expenses found"
      />
    </div>
  );
}
