import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import FellowSchoolsDatatableSkeleton from "#/components/common/fellow/fellow-schools-datatable-skeleton";

export default async function TableSkeleton() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="px-6 py-5">
      <FellowSchoolsDatatableSkeleton role={supervisor?.user.membership.role!} />
    </div>
  );
}
