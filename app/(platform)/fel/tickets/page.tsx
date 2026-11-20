import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentFellow } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const fellow = await currentFellow();
  if (fellow === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={fellow.session.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      userId={fellow.session.user.id}
      basePath="/fel/tickets"
      view={ticketsView((await props.searchParams).view)}
    />
  );
}
