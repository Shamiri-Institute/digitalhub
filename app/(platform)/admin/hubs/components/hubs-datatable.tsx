"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { toast } from "#/components/ui/use-toast";
import { fetchImplementerHubs } from "#/lib/actions/implementer";
import { columns, type HubsWithSchools } from "./columns";

export default function HubsDataTable() {
  const { data: session } = useSession();
  const [hubs, setHubs] = useState<HubsWithSchools[]>([]);
  const [loading, setLoading] = useState(true);
  const implementerIds = session?.user?.memberships?.map((membership) => membership.implementerId);
  const role = session?.user?.activeMembership?.role;
  const activeMembership = session?.user?.activeMembership;

  useEffect(() => {
    const fetchHubs = async () => {
      if (!activeMembership) return;
      setLoading(true);
      try {
        const { data: hubs } = await fetchImplementerHubs(activeMembership);
        setHubs(hubs ?? []);
      } catch (error) {
        console.error("Error fetching hubs:", error);
        toast({
          description: "Something went wrong while fetching hubs. Please try again later",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHubs();
  }, [activeMembership]);

  if (loading || !implementerIds || !role) {
    const loadingColumns = columns
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

    return (
      <div className="space-y-3 px-6 py-10">
        <DataTable
          columns={loadingColumns as ColumnDef<HubsWithSchools>[]}
          data={Array.from(Array(10).keys()).map(() => ({}) as HubsWithSchools)}
          className="data-table data-table-action lg:mt-4"
          emptyStateMessage=""
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        data={hubs}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No hubs found"
        renderSubComponent={({ row }) => {
          return (
            <SchoolsDatatable
              schools={row.original.schools}
              role={role}
              disablePagination={true}
              isSubComponent={true}
              className="lg:mt-0"
              columnVisibilityState={{
                County: false,
                "Date added": false,
                "Expected number of students": false,
                Type: false,
              }}
            />
          );
        }}
      />
    </div>
  );
}
