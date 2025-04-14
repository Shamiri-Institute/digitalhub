import { getSupervisorClinicalCasesData } from "#/app/(platform)/cl/supervisors/actions";
import { columns } from "#/app/(platform)/cl/supervisors/components/columns";
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
