import { loadHubPaymentComplaints } from "#/app/(platform)/hc/reporting/complaints/actions";
import HCComplaintsDataTable from "#/app/(platform)/hc/reporting/complaints/components/complaints-table";
import { currentHubCoordinator } from "#/app/auth";
import { signOut } from "next-auth/react";

export default async function ComplaintsPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
  }

  const complainsData = await loadHubPaymentComplaints();

  return <HCComplaintsDataTable complaints={complainsData} />;
}
