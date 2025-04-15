import FellowClinicalCasesTable from "#/app/(platform)/cl/fellows/components/fellow-clinical-cases-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function FellowsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <PageHeading title="Fellows" />
        <Separator />
        <FellowClinicalCasesTable />
      </div>
    </div>
  );
}
