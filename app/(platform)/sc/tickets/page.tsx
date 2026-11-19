import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentSupervisor } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={supervisor.session.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
      userId={supervisor.session.user.id}
      basePath="/sc/tickets"
      view={ticketsView((await props.searchParams).view)}
    />
  );
}
