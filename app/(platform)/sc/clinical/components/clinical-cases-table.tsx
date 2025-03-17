"use client";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import { columns } from "#/app/(platform)/sc/clinical/columns";
import { AddNewClinicalCaseForm } from "#/app/(platform)/sc/clinical/components/add-new-clinical-case-form";
import { ClinicalDiagnosingBoard } from "#/app/(platform)/sc/clinical/components/clinical-diagnosing-board";
import ViewMarkClinicalSessions from "#/app/(platform)/sc/clinical/components/view-mark-clinical-sessions";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { Prisma } from "@prisma/client";

export default function ClinicalCasesTable({
  cases,
  schools,
  fellowsInHub,
  supervisorsInHub,
  currentSupervisorId,
}: {
  cases: ClinicalCases[];
  schools: Prisma.SchoolGetPayload<{
    include: {
      students: true;
      interventionSessions: {
        select: {
          id: true;
          session: {
            select: {
              sessionName: true;
              sessionLabel: true;
            };
          };
        };
      };
    };
  }>[];
  fellowsInHub: Prisma.FellowGetPayload<{}>[];
  supervisorsInHub: Prisma.SupervisorGetPayload<{}>[];
  currentSupervisorId: string;
}) {
  const renderTableActions = (
    <>
      <AddNewClinicalCaseForm
        schools={schools}
        fellowsInHub={fellowsInHub}
        supervisorsInHub={supervisorsInHub}
        currentSupervisorId={currentSupervisorId}
      >
        <DialogTrigger asChild={true}>
          <Button variant="brand">New case</Button>
        </DialogTrigger>
      </AddNewClinicalCaseForm>
    </>
  );

  return (
    <DataTable
      data={cases}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      renderTableActions={renderTableActions}
      renderSubComponent={({ row }) => (
        <div className="space-y-6 p-4">
          <ClinicalDiagnosingBoard currentcase={row.original} />
          <ViewMarkClinicalSessions currentcase={row.original} />
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
