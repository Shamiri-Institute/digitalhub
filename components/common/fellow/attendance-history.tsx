"use client";

import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import AttendanceStatusWidget from "#/components/common/attendance-status-widget";
import type { SchoolFellowTableData } from "#/components/common/fellow/columns";
import DataTable from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Prisma } from "@prisma/client";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { format } from "date-fns";
import parsePhoneNumberFromString from "libphonenumber-js";
import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import FellowAttendanceGetPayload = Prisma.FellowAttendanceGetPayload;

export default function AttendanceHistory({
  attendances,
  children,
  open,
  onOpenChange,
  fellow,
  columnVisibilityState,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  attendances: FellowAttendanceGetPayload<{
    include: {
      session: {
        include: {
          session: true;
          school: true;
        };
      };
      group: true;
      PayoutStatements: true;
    };
  }>[];
  fellow: SchoolFellowTableData | MainFellowTableData | null;
  columnVisibilityState?: VisibilityState;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-3/4 lg:max-w-none">
        <DialogHeader>
          <h2 className="text-xl font-bold">Session attendance history</h2>
        </DialogHeader>
        {children}
        <DataTable
          columns={columns}
          data={attendances.filter(
            (attendance) => attendance.fellowId === fellow?.id,
          )}
          emptyStateMessage={"No sessions found"}
          columnVisibilityState={columnVisibilityState}
          className="data-table lg:mt-4"
        />
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="brand"
            onClick={() => {
              onOpenChange(false);
            }}
            className="flex items-center gap-2"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<
  FellowAttendanceGetPayload<{
    include: {
      session: {
        include: {
          session: true;
          school: true;
        };
      };
      group: true;
      PayoutStatements: true;
    };
  }>
>[] = [
  {
    id: "Date of attendance",
    header: "Date of attendance",
    accessorFn: (row) => {
      return row.session && format(row.session.sessionDate, "dd-MM-yyyy");
    },
  },
  {
    header: "School/Venue",
    id: "School/Venue",
    accessorFn: (row) => {
      return row.session?.school?.schoolName ?? row.session?.venue;
    },
  },
  {
    header: "Session",
    id: "Session",
    accessorFn: (row) => {
      return row.session && row.session.session?.sessionLabel;
    },
  },
  {
    header: "Group",
    id: "Group",
    accessorKey: "group.groupName",
  },
  {
    header: "Attendance",
    id: "Attendance",
    cell: ({ row }) => {
      return (
        <div className="flex">
          <AttendanceStatusWidget attended={row.original.attended} />
        </div>
      );
    },
  },
  {
    header: "MPESA Number",
    id: "MPESA Number",
    cell: ({ row }) => {
      const payouts = row.original.PayoutStatements;
      return row.original.attended && payouts.length > 0
        ? payouts[0]!.mpesaNumber &&
            parsePhoneNumberFromString(
              payouts[0]!.mpesaNumber,
              "KE",
            )?.formatNational()
        : null;
    },
  },
  {
    header: "Status",
    id: "Status",
    cell: ({ row }) => {
      const payouts = row.original.PayoutStatements;
      return row.original.attended && payouts.length > 0 ? (
        <div className="flex">
          {payouts[0]!.executedAt !== null ? (
            <Badge variant="shamiri-green">Payment initiated</Badge>
          ) : (
            <Badge variant="warning">Payment pending</Badge>
          )}
        </div>
      ) : null;
    },
  },
];
