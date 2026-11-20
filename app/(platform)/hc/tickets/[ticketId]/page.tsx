import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={hubCoordinator.session.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
      basePath="/hc/tickets"
    />
  );
}
