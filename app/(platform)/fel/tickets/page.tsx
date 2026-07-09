import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
export default async function TicketsPage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const result = await getAllTickets({});
  const tickets = result.success ? (result.data ?? []) : [];

  return (
    <div className="px-6 py-5">
      <TicketsDatatable
        tickets={tickets}
        role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      />
    </div>
  );
}
