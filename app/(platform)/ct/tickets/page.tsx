import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentClinicalTeam } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const clinicalTeam = await currentClinicalTeam();
  if (clinicalTeam === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={clinicalTeam.session.user.activeMembership?.role ?? ImplementerRole.CLINICAL_TEAM}
      userId={clinicalTeam.session.user.id}
      basePath="/ct/tickets"
      view={ticketsView((await props.searchParams).view)}
      bare
    />
  );
}
