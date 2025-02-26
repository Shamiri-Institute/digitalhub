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
import { useState } from "react";

export default async function ClinicalCasesTable({
  cases,
}: {
  cases: ClinicalCases[];
}) {
  const [addClinicalCaseDialog, setAddClinicalCaseDialog] = useState(false);
  function renderTableActions() {
    return (
      <div>
        <AddNewClinicalCaseForm
          open={addClinicalCaseDialog}
          onOpenChange={setAddClinicalCaseDialog}
        >
          <DialogTrigger asChild={true}>
            <Button variant="brand">New case</Button>
          </DialogTrigger>
        </AddNewClinicalCaseForm>
      </div>
    );
  }

  return (
    <DataTable
      data={cases}
      columns={columns}
      className="data-table data-table-action mt-4 bg-white"
      renderTableActions={renderTableActions()}
      renderSubComponent={({ row }) => (
        <div className="space-y-6 p-4">
          {/* Emergency Section */}
          <div>
            <DataTable
              data={row.original.emergencyPresentingIssues || []}
              columns={subColumnsEmergency}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No emergency contacts found"
            />
          </div>

          {/* General Section */}
          <div>
            <DataTable
              data={row.original.generalPresentingIssues || []}
              columns={subColumnsGeneral}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No general information found"
            />
          </div>

          {/* Clinical Session Attendance History Section */}
          <div>
            <DataTable
              data={row.original.sessionAttendanceHistory || []}
              columns={subColumnsSessionAttendanceHistory}
              className="data-table data-table-action border-0 bg-white"
              emptyStateMessage="No clinical session attendance history found"
            />
          </div>
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
