import { ImplementerRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
import { ENABLE_TICKETS, NEXT_PUBLIC_ENV } from "#/lib/constants";

export default async function TicketsPage() {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }

  if (!ENABLE_TICKETS || NEXT_PUBLIC_ENV === "production") notFound();

  const result = await getAllTickets({});
  const tickets = result.success ? (result.data ?? []) : [];

  return (
    <div className="px-6 py-5">
      <TicketsDatatable
        tickets={tickets}
        role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
        showCreateButton={false}
      />
    </div>
  );
}
