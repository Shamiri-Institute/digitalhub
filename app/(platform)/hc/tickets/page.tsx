import { ImplementerRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
import { ENABLE_TICKETS, NEXT_PUBLIC_ENV } from "#/lib/constants";

export default async function TicketsPage() {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }

  if (!ENABLE_TICKETS || NEXT_PUBLIC_ENV === "production") notFound();

  const result = await getAllTickets({});
  const tickets = result.success ? (result.data ?? []) : [];

  return (
    <div className="px-6 py-5">
      <TicketsDatatable
        tickets={tickets}
        role={hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
        showCreateButton={false}
      />
    </div>
  );
}
