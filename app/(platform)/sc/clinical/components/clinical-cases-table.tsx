"use client";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import {
  columns,
  subColumnsEmergency,
  subColumnsGeneral,
  subColumnsSessionAttendanceHistory,
} from "#/app/(platform)/sc/clinical/columns";
import { AddNewClinicalCaseForm } from "#/app/(platform)/sc/clinical/components/add-new-clinical-case-form";
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
          {/* Emergency Section */}
          <>
            <DataTable
              data={row.original.emergencyPresentingIssues || []}
              columns={subColumnsEmergency}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No emergency contacts found"
            />
          </>

          {/* General Section */}
          <>
            <DataTable
              data={row.original.generalPresentingIssues || []}
              columns={subColumnsGeneral}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No general information found"
            />
          </>

          {/* Clinical Session Attendance History Section */}
          <>
            <DataTable
              data={row.original.sessionAttendanceHistory || []}
              columns={subColumnsSessionAttendanceHistory}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No clinical session attendance history found"
            />
          </>
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
