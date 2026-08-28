import type { FellowClinicalCasesData } from "#/app/(platform)/cl/fellows/actions";
import { columns } from "#/components/common/clinical/fellow-clinical-cases-columns";
import DataTable from "#/components/data-table";

export default async function FellowClinicalCasesTable({
  getData,
}: {
  getData: () => Promise<FellowClinicalCasesData[]>;
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
