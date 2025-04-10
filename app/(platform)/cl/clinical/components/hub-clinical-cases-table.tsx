"use client";
import { HubClinicalCases } from "#/app/(platform)/cl/clinical/actions";
import { columns } from "#/app/(platform)/cl/clinical/columns";
import ViewCaseSessions from "#/app/(platform)/cl/clinical/components/view-case-session";
import ViewEmergencyPresentingIssues from "#/app/(platform)/cl/clinical/components/view-emergency-presenting-issues";
import DataTable from "#/components/data-table";

export default function AllHubClinicalCasesTable({
  cases,
}: {
  cases: HubClinicalCases[];
}) {
  return (
    <DataTable
      data={cases}
      columns={columns}
      className="data-table data-table-action bg-white lg:mt-4"
      renderSubComponent={({ row }) => (
        <div className="space-y-6 p-4">
          <ViewCaseSessions
            initialContact={row.original.initialContact ?? ""}
            upcomingSession={row.original.upcomingSession ?? ""}
            noOfClinicalSessions={row.original.noOfClinicalSessions ?? 0}
            caseStatus={row.original.caseStatus ?? ""}
          />
          <ViewEmergencyPresentingIssues
            emergencyPresentingIssuesBaseline={
              row.original.emergencyPresentingIssuesBaseline
            }
            emergencyPresentingIssuesEndpoint={
              row.original.emergencyPresentingIssuesEndpoint
            }
          />
          {/* <ViewGeneralPresentingIssues generalPresentingIssuesBaseline={row.original.generalPresentingIssuesBaseline } generalPresentingIssuesEndpoint={row.original.generalPresentingIssuesEndpoint} generalPresentingIssuesOtherSpecifiedBaseline={row.original.generalPresentingIssuesOtherSpecifiedBaseline ?? null} generalPresentingIssuesOtherSpecifiedEndpoint={row.original.generalPresentingIssuesOtherSpecifiedEndpoint} /> */}
        </div>
      )}
      emptyStateMessage="No clinical cases found"
    />
  );
}
