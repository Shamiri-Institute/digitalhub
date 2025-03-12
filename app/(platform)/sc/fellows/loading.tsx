"use client";

import type { FellowsData } from "#/app/(platform)/sc/actions";
import { columns } from "#/app/(platform)/sc/fellows/components/columns";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { DialogTrigger } from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";

export default function TableSkeleton() {
  const loadingColumns = columns({
    state: {
      setFellow: () => null,
      setWeeklyEvaluationDialog: () => false,
      setEditFellowDialog: () => false,
      setAttendanceHistoryDialog: () => false,
      setUploadContractDialog: () => false,
      setUploadIdDialog: () => false,
      setUploadQualificationDialog: () => false,
      setComplaintsDialog: () => false,
      setDropOutDialog: () => false,
    },
  })
    .map((column) => column.id ?? column.header)
    .map((column) => {
      const renderSkeleton = column !== "checkbox" && column !== "button";
      return {
        header: renderSkeleton ? column : "",
        id: column,
        cell: () => {
          return renderSkeleton ? (
            <Skeleton className="h-5 w-full bg-gray-200" />
          ) : null;
        },
      };
    });

  function renderTableActions() {
    return (
      <FellowDetailsForm open={false} onOpenChange={() => {}} mode={"add"}>
        <DialogTrigger asChild={true}>
          <Button variant="brand" disabled>
            Add new fellow
          </Button>
        </DialogTrigger>
      </FellowDetailsForm>
    );
  }

  return (
    <div className="px-6 py-5">
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
    </div>
  );
}
