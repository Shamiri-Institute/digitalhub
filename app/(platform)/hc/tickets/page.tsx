import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={hubCoordinator.session.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
      userId={hubCoordinator.session.user.id}
      basePath="/hc/tickets"
      view={ticketsView((await props.searchParams).view)}
    />
  );
}
