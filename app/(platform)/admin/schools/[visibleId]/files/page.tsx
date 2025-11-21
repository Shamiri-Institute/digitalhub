import { currentAdminUser } from "#/app/auth";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SchoolFilesPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const admin = await currentAdminUser();
  if (admin === null) {
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
