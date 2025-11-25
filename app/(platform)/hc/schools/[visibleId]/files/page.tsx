import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { signOut } from "next-auth/react";
import { db } from "#/lib/db";

export default async function SchoolFilesPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const hc = await currentHubCoordinator();
  if (!hc) {
    await signOut({ callbackUrl: "/login" });
  }

  const { visibleId } = await params;
  const schoolFiles = await db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
