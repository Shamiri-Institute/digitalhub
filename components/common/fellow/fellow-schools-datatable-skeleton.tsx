"use client";

import type { FellowsData } from "#/app/(platform)/sc/actions";
import { fellowSchoolsColumns } from "#/components/common/fellow/fellow-schools-columns";
import { BatchUploadDownloadFellow } from "#/components/common/fellow/upload-csv";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

export default function FellowSchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = fellowSchoolsColumns({
    state: {
      setFellow: () => null,
      setWeeklyEvaluationDialog: () => false,
      setEditFellowDialog: () => false,
      setAttendanceHistoryDialog: () => false,
      setUploadContractDialog: () => false,
      setUploadIdDialog: () => false,
      setUploadQualificationDialog: () => false,
      setComplaintsDialog: () => false,
      role,
    },
  })
    .map((column) => column.id ?? column.header)
    .map((column) => {
      const renderSkeleton = column !== "checkbox" && column !== "button";
      return {
        header: renderSkeleton ? column : "",
        id: column,
        cell: () => {
          return renderSkeleton ? <Skeleton className="h-5 w-full bg-gray-200" /> : null;
        },
      };
    });

  const renderTableActions = () => {
    return <BatchUploadDownloadFellow disabled={true} role={role} />;
  };

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<FellowsData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as FellowsData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
      columnVisibilityState={{
        "MPESA Name": false,
        "Average Rating": false,
        "Active Status": false,
        County: false,
        "Fellow Email": false,
        "Phone Number": false,
        "ID Number": false,
        "Date of Birth": false,
        Gender: false,
        "Sub-county": false,
      }}
    />
  );
}
