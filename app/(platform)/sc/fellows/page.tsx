import AddNewFellowForm from "#/app/(platform)/sc/components/add-new-fellow-form";
import { Button } from "#/components/ui/button";
import { Suspense } from "react";
import FellowsDataTable from "./components/fellows-data-table";

export default function FellowsPage() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between py-5">
        <div className="flex gap-3">
          <div>Search bar goes here</div>
          <div>Filter options go here</div>
        </div>
        <div className="flex gap-3">
          <AddNewFellowForm>
            <Button>New Fellow</Button>
          </AddNewFellowForm>
          <div>Edit column button goes here</div>
          <div>Toggle view goes here</div>
        </div>
      </div>
      <Suspense fallback={<div>Loading fellows data</div>}>
        <FellowsDataTable />
      </Suspense>
    </div>
  );
}
