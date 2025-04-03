"use client";
import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import AddHubCoordinatorForm from "#/components/common/expenses/payout-history/components/add-hub-coordinator-form";
import CreateImplementerForm from "#/components/common/expenses/payout-history/components/create-implementer-form";
import CreateProjectsForm from "#/components/common/expenses/payout-history/components/create-projects-form";
import PayoutFrequencyForm from "#/components/common/expenses/payout-history/components/payout-frequency-form";
import PayoutSettingsForm from "#/components/common/expenses/payout-history/components/payout-settings-form";
import FellowPayoutFilterTab from "#/components/common/expenses/payout-history/payout-filter";
import { HubWithProjects } from "#/components/common/expenses/payout-history/types";
import DataTable from "#/components/data-table";
import { Implementer, Project } from "@prisma/client";
import { columns } from "./columns";
import CreateHubForm from "./components/create-hub-form";

export default function FellowPayoutHistoryDataTable({
  payoutHistory,
  hubs,
  implementers,
  projects,
}: {
  payoutHistory:
    | HubPayoutHistoryType[]
    | OpsHubsPayoutHistoryType[]
    | SupervisorPayoutHistoryType[];
  hubs?: HubWithProjects[];
  implementers?: Implementer[];
  projects?: Project[];
}) {
  const renderTableActions = () => {
    return (
      <div className="flex items-center gap-3">
        <CreateImplementerForm />

        <CreateProjectsForm />
        <CreateHubForm
          implementers={implementers || []}
          projects={projects || []}
        />
        <AddHubCoordinatorForm hubs={hubs || []} />
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
