"use client";

import type { Row } from "@tanstack/react-table";
import { useState } from "react";
import { updateClinicalSessionAttendance } from "#/app/(platform)/sc/clinical/action";
import type { AttendanceRecord } from "#/app/(platform)/sc/clinical/components/columns";
import { CustomIndicator } from "#/components/common/mark-attendance";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "#/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { toast } from "#/components/ui/use-toast";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

type AttendanceMark = "attended" | "missed" | "unmarked";

function savedMarkOf(row: Row<AttendanceRecord>): AttendanceMark {
  const attendanceStatus = row.getValue("attendanceStatus");
  if (attendanceStatus === true) return "attended";
  if (attendanceStatus === false) return "missed";
  return "unmarked";
}

export default function HandleSessionAttendanceUpdate({ row }: { row: Row<AttendanceRecord> }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <RowActionsTrigger label={`Actions for ${row.original.session}`} className="bg-white" />
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setIsOpen(true)}>Mark attendance</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <MarkClinicalAttendanceForm row={row} close={() => setIsOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function MarkClinicalAttendanceForm({
  row,
  close,
}: {
  row: Row<AttendanceRecord>;
  close: () => void;
}) {
  const savedMark = savedMarkOf(row);
  const [selectedMark, setSelectedMark] = useState<AttendanceMark>(savedMark);
  const { isSaving, save } = useDialogSave();

  const handleAttendanceUpdate = (status: boolean | null) => {
    save(async () => {
      const response = await updateClinicalSessionAttendance(row.original.sessionId, status);
      if (response.success) {
        toast({ description: response.message });
        close();
      } else {
        toast({ variant: "destructive", description: response.message });
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Mark Attendance</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Session: {row.original.session} - {row.original.sessionDate}
        </p>
        <p className="text-sm text-muted-foreground">
          Current Status:{" "}
          {savedMark === "attended" ? "Attended" : savedMark === "missed" ? "Missed" : "Not marked"}
        </p>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <RadioGroup
          value={selectedMark}
          onValueChange={(value) => {
            setSelectedMark(value as AttendanceMark);
          }}
          className="grid grid-cols-3 gap-2"
        >
          <div className="relative">
            <CustomIndicator className="green" label="Attended" />
            <RadioGroupItem
              aria-label="Attended"
              value="attended"
              id="mark_attended"
              className="custom-radio border-border data-checked:border-success"
            />
          </div>
          <div className="relative">
            <CustomIndicator className="red" label="Missed" />
            <RadioGroupItem
              aria-label="Missed"
              value="missed"
              id="mark_missed"
              className="custom-radio border-border data-checked:border-destructive"
            />
          </div>
          <div className="relative">
            <CustomIndicator className="blue" label="Unmarked" />
            <RadioGroupItem
              aria-label="Unmarked"
              value="unmarked"
              id="unmarked"
              className="custom-radio border-border data-checked:border-primary"
            />
          </div>
        </RadioGroup>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={isSaving}
            loading={isSaving}
            onClick={() => {
              const status =
                selectedMark === "attended" ? true : selectedMark === "missed" ? false : null;
              handleAttendanceUpdate(status);
            }}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}
