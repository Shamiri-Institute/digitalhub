"use client";

import type { ImplementerRole, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, type SchoolGroupDataTableData } from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function GroupsDatatableSkeleton({
  role,
  rows = 10,
}: {
  role: ImplementerRole;
  rows?: number;
}) {
  const loadingColumns = columns({
    setGroup: () => {},
    setStudentsDialog: () => {},
    setEvaluationDialog: () => {},
    setLeaderDialog: () => {},
    setArchiveDialog: () => {},
    role,
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
    return role !== "FELLOW" ? (
      <CreateGroup
        supervisors={[]}
        school={
          {
            schoolName: "",
          } as Prisma.SchoolGetPayload<{}>
        }
        groupCount={0}
        disabled={true}
      />
    ) : null;
  };

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<SchoolGroupDataTableData>[]}
      data={
        Array.from(Array(rows).keys()).map(() => {
          return {};
        }) as SchoolGroupDataTableData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
    />
  );
}
