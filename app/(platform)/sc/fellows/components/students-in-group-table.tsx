"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
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
      <DialogContent className="max-h-screen min-w-max overflow-x-auto overflow-y-auto p-5">
        <DialogHeader>
          <h2>Students in Group</h2>
          <DialogAlertWidget label={groupName} />
        </DialogHeader>
        <div>
          <DataTable
            columns={studentsTableColumns}
            data={students}
            emptyStateMessage="No students found in this group"
            editColumns={false}
          />
        </div>
        <DialogFooter className="flex justify-end">
          <Button onClick={() => setDialogOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
