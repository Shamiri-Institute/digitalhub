import SupervisorClinicalCasesTable from "#/app/(platform)/ct/supervisors/components/supervisor-clinical-cases-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function SupervisorsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <PageHeading title="Supervisors" />
        <Separator />
        <SupervisorClinicalCasesTable />
      </div>
    </div>
  );
}
