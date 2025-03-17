"use client";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import { attendanceColumns } from "#/app/(platform)/sc/clinical/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { useState } from "react";

export default function ClinicalCaseSessionsAttendanceHistory({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] max-w-[90vw] overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Clinical attendance history</h2>
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <div className="mt-1 max-w-full overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <DataTable
            columns={attendanceColumns}
            data={clinicalCase.sessionAttendanceHistory || []}
            className={"data-table data-table-action bg-white lg:mt-4"}
            emptyStateMessage="No Clinical Case Attendance History"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
