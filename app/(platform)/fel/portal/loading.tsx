import { currentFellow } from "#/app/auth";
import FellowSchoolsDatatableSkeleton from "#/components/common/fellow/fellow-schools-datatable-skeleton";
import { signOut } from "next-auth/react";

export default async function TableSkeleton() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <FellowSchoolsDatatableSkeleton role={fellow?.user.membership.role!} />
  );
}
