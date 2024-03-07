"use client";

import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

export type SchoolsTableData = Prisma.SchoolGetPayload<{
  include: {
    assignedSupervisor: true;
  };
}>;

export const columns: ColumnDef<SchoolsTableData>[] = [
  {
    accessorKey: "schoolName",
    header: "School Name",
  },
  /**
   * TODO: uncomment this once we support the subcounty column in the SDH database
   * {
   *    accessorKey: 'schoolSubCounty',
   *    header: 'Sub - County'
   *  },
   */
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "numbersExpected",
    header: "Students",
  },
  {
    accessorFn: (row) => row.assignedSupervisor?.supervisorName,
    header: "Point Supervisor",
  },
  // TODO: find a way to find the upcoming session
  /*
  {
    header: 'Upcoming Session',
    accessorKey: 
  },
  */
  {
    header: "Report submission FIXME",
    accessorKey: "schoolName",
  },
  {
    header: "School ID",
    accessorKey: "id",
  },
  {
    header: "County",
    accessorKey: "schoolCounty",
  },
  {
    header: "Point Teacher",
    accessorKey: "pointPersonName",
  },
  {
    header: "Point Teacher Phone Number",
    accessorKey: "pointPersonPhone",
  },
  {
    header: "Point Supervisor Phone Number",
    accessorFn: (row) => row.assignedSupervisor?.cellNumber,
  },
  {
    header: "Point Supervisor Email",
    accessorFn: (row) => row.assignedSupervisor?.supervisorEmail,
  },
  {
    header: "Date added",
    // TODO: need to date fns to format this
    accessorKey: "createdAt",
  },
  {
    header: "Type",
    accessorKey: "schoolType",
  },
];
