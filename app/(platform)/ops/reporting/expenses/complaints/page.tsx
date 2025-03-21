import { loadOpsHubsPaymentComplaints } from "#/app/(platform)/ops/reporting/expenses/complaints/actions";
import { currentOpsUser } from "#/app/auth";
import FellowComplaintsDataTable from "#/components/common/expenses/complaints/complaints-table";
import { signOut } from "next-auth/react";

export default async function ComplaintsPage() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    await signOut({ callbackUrl: "/login" });
  }

  const complainsData = await loadOpsHubsPaymentComplaints();

  return <FellowComplaintsDataTable complaints={complainsData} />;
}
