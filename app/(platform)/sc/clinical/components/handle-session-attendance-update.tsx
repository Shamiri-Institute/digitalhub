"use client";

import type { Row } from "@tanstack/react-table";
import { useState } from "react";
import { updateClinicalSessionAttendance } from "#/app/(platform)/sc/clinical/action";
import type { AttendanceRecord } from "#/app/(platform)/sc/clinical/components/columns";
import { CustomIndicator } from "#/components/common/mark-attendance";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { toast } from "#/components/ui/use-toast";

export default function HandleSessionAttendanceUpdate({
  row,
  userRole: _userRole = "SUPERVISOR",
}: {
  row: Row<AttendanceRecord>;
  userRole: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(
    row.getValue("attendanceStatus") === true
      ? "attended"
      : row.getValue("attendanceStatus") === false
        ? "missed"
        : "unmarked",
  );

  const handleAttendanceUpdate = async (status: boolean | null) => {
    try {
      const response = await updateClinicalSessionAttendance(row.original.sessionId, status);
      if (response.success) {
        toast({ description: response.message });
        setIsOpen(false);
      } else {
        toast({ variant: "destructive", description: response.message });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="absolute inset-0 border-l bg-white">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setIsOpen(true)}>Mark attendance</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Session: {row.original.session} - {row.original.sessionDate}
            </p>
            <p className="text-sm text-muted-foreground">
              Current Status:{" "}
              {row.getValue("attendanceStatus") === true
                ? "Attended"
                : row.getValue("attendanceStatus") === false
                  ? "Missed"
                  : "Not marked"}
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <RadioGroup
              defaultValue={
                row.getValue("attendanceStatus") === true
                  ? "attended"
                  : row.getValue("attendanceStatus") === false
                    ? "missed"
                    : "unmarked"
              }
              onValueChange={(value) => {
                setSelectedStatus(value);
              }}
              className="grid grid-cols-3 gap-2"
            >
              <div className="relative">
                <CustomIndicator className="green" label="Attended" />
                <RadioGroupItem
                  value="attended"
                  id="mark_attended"
                  className="custom-radio border-gray-300 data-[state=checked]:border-shamiri-green"
                />
              </div>
              <div className="relative">
                <CustomIndicator className="red" label="Missed" />
                <RadioGroupItem
                  value="missed"
                  id="mark_missed"
                  className="custom-radio border-gray-300 data-[state=checked]:border-shamiri-red"
                />
              </div>
              <div className="relative">
                <CustomIndicator className="blue" label="Unmarked" />
                <RadioGroupItem
                  value="unmarked"
                  id="unmarked"
                  className="custom-radio border-gray-300 data-[state=checked]:border-shamiri-new-blue"
                />
              </div>
            </RadioGroup>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const status =
                    selectedStatus === "attended"
                      ? true
                      : selectedStatus === "missed"
                        ? false
                        : null;
                  handleAttendanceUpdate(status);
                }}
              >
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
