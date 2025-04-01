"use client";
import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import AddHubCoordinatorForm from "#/components/common/expenses/payout-history/components/add-hub-coordinator-form";
import CreateProjectsForm from "#/components/common/expenses/payout-history/components/create-projects-form";
import PayoutFrequencyForm from "#/components/common/expenses/payout-history/components/payout-frequency-form";
import PayoutSettingsForm from "#/components/common/expenses/payout-history/components/payout-settings-form";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { HubWithProjects } from "#/components/common/expenses/payout-history/types";
import DataTable from "#/components/data-table";
import { Implementer } from "@prisma/client";
import { columns } from "./columns";

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
  hubs,
  implementers,
}: {
  payoutHistory:
    | HubPayoutHistoryType[]
    | OpsHubsPayoutHistoryType[]
    | SupervisorPayoutHistoryType[];
  hubs?: HubWithProjects[];
  implementers?: Implementer[];
}) {
  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <AddHubCoordinatorForm
          hubs={hubs || []}
          implementers={implementers || []}
        />
        <CreateProjectsForm
          implementers={implementers || []}
          hubs={hubs || []}
        />
        <PayoutSettingsForm hubs={hubs || []} />
        <PayoutFrequencyForm />
      </div>
    );
  };

  return (
    <div className="container w-full grow space-y-3">
      <FellowPayoutFilterTab />
      <DataTable
        data={payoutHistory}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No payout history found"
        renderTableActions={renderTableActions()}
      />
    </div>
  );
}
