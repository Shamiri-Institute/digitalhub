import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import TicketsPage, { ticketsView } from "#/components/common/ticket/tickets-page";

export default async function Page(props: { searchParams: Promise<{ view?: string | string[] }> }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }

  return (
    <TicketsPage
      role={admin.session.user.activeMembership?.role ?? ImplementerRole.ADMIN}
      userId={admin.session.user.id}
      basePath="/admin/tickets"
      view={ticketsView((await props.searchParams).view)}
    />
  );
}
