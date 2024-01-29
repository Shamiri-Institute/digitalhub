import Link from "next/link";

import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { RefundForm } from "./refund-form";

export default async function RefundPage() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  if (!supervisor.assignedSchools) {
    throw new Error("Supervisor has no assigned schools");
  }
  const assignedSchool = supervisor.assignedSchools[0];
  if (!assignedSchool) {
    throw new Error("Supervisor has no assigned school");
  }
  if (!assignedSchool.hubId) {
    throw new Error("Assigned school has no hub");
  }

  return (
    <main className="mx-auto max-w-3xl">
      <PageHeader />
      <RefundForm supervisorId={supervisor.id} hubId={assignedSchool.hubId} />
    </main>
  );
}

function PageHeader() {
  return (
    <div className="mt-8 flex justify-between lg:mt-2">
      <h1 className="text-xl font-semibold">Request Refund</h1>
      <Link href={"/profile"}>
        <Icons.xIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}
