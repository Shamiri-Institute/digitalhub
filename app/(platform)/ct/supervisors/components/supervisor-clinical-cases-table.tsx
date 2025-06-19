import { getSupervisorClinicalCasesData } from "#/app/(platform)/ct/supervisors/actions";
import { columns } from "#/app/(platform)/ct/supervisors/components/columns";
import DataTable from "#/components/data-table";

export default async function SupervisorClinicalCasesTable() {
  const data = await getSupervisorClinicalCasesData();
  return (
    <DataTable
      data={data}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No clinical cases found"
    />
  );
}
