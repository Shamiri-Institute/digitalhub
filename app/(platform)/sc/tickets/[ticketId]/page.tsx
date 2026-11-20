import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentSupervisor } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={supervisor.session.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
      basePath="/sc/tickets"
    />
  );
}
