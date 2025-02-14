"use client";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import {
  columns,
  subColumnsEmergency,
  subColumnsGeneral,
  subColumnsSessionAttendanceHistory,
} from "#/app/(platform)/sc/clinical/columns";
import DataTable from "#/components/data-table";

export default async function ClinicalCasesTable({
  cases,
}: {
  cases: ClinicalCases[];
}) {
  return (
    <DataTable
      data={cases}
      columns={columns}
      className="data-table data-table-action mt-4 bg-white"
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
