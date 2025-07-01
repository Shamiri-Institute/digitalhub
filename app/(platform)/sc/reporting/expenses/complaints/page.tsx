import { signOut } from "next-auth/react";
import { loadFellowPaymentComplaints } from "#/app/(platform)/sc/reporting/expenses/complaints/actions";
import { currentSupervisor } from "#/app/auth";
import FellowComplaintsDataTable from "#/components/common/expenses/complaints/complaints-table";

export default async function ComplaintsPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    await signOut({ callbackUrl: "/login" });
  }

  const complainsData = await loadFellowPaymentComplaints();

  return <FellowComplaintsDataTable complaints={complainsData} />;
}
