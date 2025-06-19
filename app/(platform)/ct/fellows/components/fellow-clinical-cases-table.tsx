import { getFellowClinicalCasesData } from "#/app/(platform)/ct/fellows/actions";
import { columns } from "#/app/(platform)/ct/fellows/components/columns";
import DataTable from "#/components/data-table";

export default async function FellowClinicalCasesTable() {
  const data = await getFellowClinicalCasesData();
  return (
    <DataTable
      data={data}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      emptyStateMessage="No clinical cases found"
    />
  );
}
