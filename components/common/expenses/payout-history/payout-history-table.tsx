"use client";
import DataTable from "#/components/data-table";
import { Dialog, DialogTrigger } from "#/components/ui/dialog";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import AddHubCoordinatorForm from "#/components/common/expenses/payout-history/components/add-hub-coordinator-form";
import CreateProjectsForm from "#/components/common/expenses/payout-history/components/create-projects-form";
import PayoutFrequencyForm from "#/components/common/expenses/payout-history/components/payout-frequency-form";
import PayoutSettingsForm from "#/components/common/expenses/payout-history/components/payout-settings-form";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { HubWithProjects } from "#/components/common/expenses/payout-history/types";
import { Button } from "#/components/ui/button";
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
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Add Hub Coordinator
            </Button>
          </DialogTrigger>
          <AddHubCoordinatorForm
            hubs={hubs || []}
            implementers={implementers || []}
          />
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Create Project
            </Button>
          </DialogTrigger>
          <CreateProjectsForm
            implementers={implementers || []}
            hubs={hubs || []}
          />
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Payout Settings
            </Button>
          </DialogTrigger>
          <PayoutSettingsForm hubs={hubs || []} />
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white">
              Payout Frequency
            </Button>
          </DialogTrigger>
          <PayoutFrequencyForm />
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
