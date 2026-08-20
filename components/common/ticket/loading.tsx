"use client";

import { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import DataTable from "#/components/data-table";
import { isEscalationInitiatorRole } from "#/lib/actions/ticket/types";
import { columns, type TicketData } from "./columns";
import CreateTicketDialog from "./create-ticket-dialog";

export default function TicketsLoading({
  userRole = ImplementerRole.FELLOW,
  rows = 5,
}: {
  userRole?: ImplementerRole;
  rows?: number;
}) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      setTicket: () => {},
      setViewDialog: () => {},
      setResolutionDialog: () => {},
      setEscalateDialog: () => {},
      setReassignDialog: () => {},
      role: userRole,
    }),
  );

  const renderTableActions = () => {
    if (!isEscalationInitiatorRole(userRole)) return null;
    return <CreateTicketDialog disabled />;
  };

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<TicketData>(rows)}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
    />
  );
}
