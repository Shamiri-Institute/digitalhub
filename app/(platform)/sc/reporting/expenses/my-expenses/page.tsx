import { signOut } from "next-auth/react";
import { loadSupervisorExpenses } from "#/app/(platform)/sc/reporting/expenses/my-expenses/actions";
import AddSupervisorExpenseTrigger from "#/app/(platform)/sc/reporting/expenses/my-expenses/components/add-supervisor-expense";
import SupervisorExpensesDataTable from "#/app/(platform)/sc/reporting/expenses/my-expenses/components/supervisors-table";
import { currentSupervisor } from "#/app/auth";

export default async function MyExpensesPage() {
  const expensesData = await loadSupervisorExpenses();

  const supervisor = await currentSupervisor();

  if (!supervisor) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="container w-full grow space-y-3">
      <AddSupervisorExpenseTrigger supervisorsInHub={[]} />
      <SupervisorExpensesDataTable supervisorExpenses={expensesData} />
    </div>
  );
}
