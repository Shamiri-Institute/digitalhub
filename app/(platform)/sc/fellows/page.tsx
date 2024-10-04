import { loadFellowsData } from "../actions";
import FellowsDataTable from "./components/fellows-data-table";

export default async function FellowsPage() {
  const fellows = await loadFellowsData();
  return (
    <div className="px-6 py-5">
      <FellowsDataTable fellows={fellows} />
    </div>
  );
}
