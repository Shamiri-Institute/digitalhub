import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentFellow } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const fellow = await currentFellow();
  if (fellow === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={fellow.session.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      basePath="/fel/tickets"
    />
  );
}
