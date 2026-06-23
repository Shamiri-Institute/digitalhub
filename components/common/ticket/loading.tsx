"use client";

import { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import DataTable from "#/components/data-table";
import { columns, type TicketData } from "./columns";
import CreateTicketDialog from "./create-ticket-dialog";

export default function TicketsLoading({
  userRole = ImplementerRole.FELLOW,
  rows = 5,
  showCreateButton = true,
}: {
  userRole?: ImplementerRole;
  rows?: number;
  showCreateButton?: boolean;
}) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      setTicket: () => {},
      setViewDialog: () => {},
      setResolutionDialog: () => {},
      setEscalateDialog: () => {},
      role: userRole,
    }),
  );

  const renderTableActions = () => {
    if (!showCreateButton) return null;
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
