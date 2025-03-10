import { currentFellow } from "#/app/auth";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SchoolFilesPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  //TODO: Filter files for fellow only
  const schoolFiles = db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
