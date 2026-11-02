import { notFound } from "next/navigation";

import { fetchSchoolsTableRows } from "#/components/common/schools/queries";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import { ImplementerRole } from "#/db/enums";
import { fetchAdminHub } from "../../queries";

export default async function HubSchoolsPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const hub = await fetchAdminHub(hubId);
  if (!hub) {
    notFound();
  }
  const schools = await fetchSchoolsTableRows(hub.id);

  return <SchoolsDatatable schools={schools} role={ImplementerRole.ADMIN} />;
}
