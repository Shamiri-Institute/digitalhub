import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";

export default async function SchoolFilesPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;
  const hc = await currentHubCoordinator();
  if (!hc) {
    await signOut({ callbackUrl: "/login" });
  }

  const { visibleId } = params;
  const schoolFiles = await db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
