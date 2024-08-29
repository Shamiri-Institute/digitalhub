import DataTable from "#/app/(platform)/hc/components/data-table";
import { loadFellowsData } from "../../actions";
import { columns } from "./columns";

export default async function FellowsDataTable() {
  const fellows = await loadFellowsData()

  return <DataTable data={fellows} columns={columns} emptyStateMessage="No Fellows Assigned to you" />
}
