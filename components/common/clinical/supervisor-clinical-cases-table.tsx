import type { SupervisorClinicalCasesData } from "#/app/(platform)/cl/supervisors/actions";
import { columns } from "#/components/common/clinical/supervisor-clinical-cases-columns";
import DataTable from "#/components/data-table";

export default async function SupervisorClinicalCasesTable({
  getData,
}: {
  getData: () => Promise<SupervisorClinicalCasesData[]>;
}) {
  const data = await getData();
  return (
    <DataTable
      data={data}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No clinical cases found"
    />
  );
}
