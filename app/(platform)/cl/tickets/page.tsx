import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentClinicalLead } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const clinicalLead = await currentClinicalLead();
  if (clinicalLead === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={clinicalLead.session.user.activeMembership?.role ?? ImplementerRole.CLINICAL_LEAD}
      userId={clinicalLead.session.user.id}
      basePath="/cl/tickets"
      view={ticketsView((await props.searchParams).view)}
      bare
    />
  );
}
