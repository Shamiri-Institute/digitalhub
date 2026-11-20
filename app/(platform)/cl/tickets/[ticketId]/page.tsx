import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentClinicalLead } from "#/app/auth";
import TicketPage from "#/components/common/ticket/ticket-page";

export default async function Page(props: { params: Promise<{ ticketId: string }> }) {
  const clinicalLead = await currentClinicalLead();
  if (clinicalLead === null) {
    redirect("/login");
  }

  return (
    <TicketPage
      ticketId={(await props.params).ticketId}
      role={clinicalLead.session.user.activeMembership?.role ?? ImplementerRole.CLINICAL_LEAD}
      basePath="/cl/tickets"
      bare
    />
  );
}
