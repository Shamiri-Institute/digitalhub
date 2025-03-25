"use client";
import DataTable from "#/components/data-table";
import { Dialog, DialogTrigger } from "#/components/ui/dialog";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import CreateProjectsForm from "#/components/common/expenses/payout-history/components/create-projects-form";
import PayoutSettingsForm from "#/components/common/expenses/payout-history/components/payout-settings-form";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { Button } from "#/components/ui/button";
import { columns } from "./columns";

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
}: {
  payoutHistory:
    | HubPayoutHistoryType[]
    | OpsHubsPayoutHistoryType[]
    | SupervisorPayoutHistoryType[];
}) {
  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Create Project
            </Button>
          </DialogTrigger>
          <CreateProjectsForm />
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Payout Settings
            </Button>
          </DialogTrigger>
          <PayoutSettingsForm />
        </Dialog>
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
