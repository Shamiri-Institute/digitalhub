import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentSupervisor } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
export default async function TicketsPage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  const result = await getAllTickets({});
  const tickets = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-3 px-6 py-5">
      <PageHeading title="Tickets" />
      <Separator />
      <TicketsDatatable
        tickets={tickets}
        role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
      />
    </div>
  );
}
