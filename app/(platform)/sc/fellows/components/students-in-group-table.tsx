"use client";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { useState } from "react";
import { FellowsData } from "../../actions";
import { studentsTableColumns } from "./columns";

export default function StudentsInGroupTable({
  children,
  students,
  groupName,
}: {
  children: React.ReactNode;
  students: FellowsData["sessions"][number]["students"];
  groupName: FellowsData["sessions"][number]["groupName"];
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>Students in Group</h2>
          <DialogAlertWidget label={groupName} />
        </DialogHeader>
        <div className="min-w-max overflow-x-auto overflow-y-scroll">
          <DataTable
            columns={studentsTableColumns}
            data={students}
            emptyStateMessage="No students found in this group"
            editColumns={false}
          />
        </div>
        <DialogFooter className="sticky bottom-0 z-10 w-full bg-white">
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(false)}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
