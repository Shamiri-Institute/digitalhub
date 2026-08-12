import { ImplementerRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
export default async function TicketsPage() {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }

  const result = await getAllTickets({});
  const tickets = result.success ? (result.data ?? []) : [];

  return (
    <div className="px-6 py-5">
      <TicketsDatatable
        tickets={tickets}
        role={
          hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR
        }
      />
    </div>
  );
}
