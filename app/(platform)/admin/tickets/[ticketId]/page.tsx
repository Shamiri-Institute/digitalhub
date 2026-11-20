import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={admin.session.user.activeMembership?.role ?? ImplementerRole.ADMIN}
      basePath="/admin/tickets"
    />
  );
}
