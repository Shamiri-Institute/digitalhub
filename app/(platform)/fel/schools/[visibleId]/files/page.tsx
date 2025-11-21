import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";

export default async function SchoolFilesPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  //TODO: Filter files for fellow only
  const schoolFiles = await db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
