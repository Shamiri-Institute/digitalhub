import { ImplementerRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import TicketsDatatable from "#/components/common/ticket/tickets-datatable";
import { getAllTickets } from "#/lib/actions/ticket";
import { ENABLE_TICKETS, NEXT_PUBLIC_ENV } from "#/lib/constants";

export default async function TicketsPage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!ENABLE_TICKETS || NEXT_PUBLIC_ENV === "production") notFound();

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
