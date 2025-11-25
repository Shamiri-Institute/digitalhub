import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SchoolFilesPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const schoolFiles = await db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
