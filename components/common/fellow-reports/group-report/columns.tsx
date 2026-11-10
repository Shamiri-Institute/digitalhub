"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { FellowGroupReportRow } from "#/components/common/fellow-reports/group-report/actions";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export const groupReportColumns = (
  onView: (row: FellowGroupReportRow) => void,
): ColumnDef<FellowGroupReportRow>[] => [
  {
    accessorKey: "groupName",
    header: "Group",
  },
  {
    accessorKey: "fellowName",
    header: "Fellow name",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const submitted = row.original.status === "Submitted";
      return (
        <span
          className={cn(
            "inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium",
            submitted ? "bg-success-bg text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {row.original.status}
        </span>
      );
    },
  },
  {
    accessorKey: "submittedAt",
    header: "Submission date",
    cell: ({ row }) => {
      const submittedAt = row.original.submittedAt;
      return <span>{submittedAt ? format(submittedAt, "dd MMM yyyy") : "—"}</span>;
    },
  },
  {
    id: "action",
    header: () => <span className="sr-only">Report</span>,
    cell: ({ row }) => {
      if (!row.original.report) {
        return null;
      }
      return (
        <Button type="button" variant="ghost" size="sm" onClick={() => onView(row.original)}>
          View report
        </Button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
