import Link from "next/link";

import { currentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { RefundForm } from "./refund-form";

export default async function RefundPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor.assignedSchool) {
    throw new Error("Supervisor has no assigned school");
  }
  if (!supervisor.assignedSchool.hubId) {
    throw new Error("Assigned school has no hub");
  }

  return (
    <>
      <PageHeader />
      <RefundForm
        supervisorId={supervisor.id}
        hubId={supervisor.assignedSchool.hubId}
      />
    </>
  );
}

function PageHeader() {
  return (
    <div className="mt-2 flex justify-end">
      <Link href={"/profile"}>
        <Icons.xIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}
