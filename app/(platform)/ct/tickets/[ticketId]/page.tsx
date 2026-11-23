import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentClinicalTeam } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const clinicalTeam = await currentClinicalTeam();
  if (clinicalTeam === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={clinicalTeam.session.user.activeMembership?.role ?? ImplementerRole.CLINICAL_TEAM}
      basePath="/ct/tickets"
      bare
    />
  );
}
