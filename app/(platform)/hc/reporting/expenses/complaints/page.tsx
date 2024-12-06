import { loadHubPaymentComplaints } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import { currentHubCoordinator } from "#/app/auth";
import FellowComplaintsDataTable from "#/components/common/expenses/complaints/complaints-table";
import { signOut } from "next-auth/react";

export default async function ComplaintsPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    await signOut({ callbackUrl: "/login" });
  }

  const complainsData = await loadHubPaymentComplaints();

  return <FellowComplaintsDataTable complaints={complainsData} />;
}
