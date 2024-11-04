import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { getInitials } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import React, { Dispatch, SetStateAction } from "react";

export default function FellowComplaints({
  children,
  open,
  onOpenChange,
  complaints,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  complaints: Prisma.FellowComplaintsGetPayload<{
    include: {
      supervisor: true;
    };
  }>[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <h2 className="text-xl font-bold">View fellow complaints</h2>
        </DialogHeader>
        {children}
        <div className="flex flex-col">
          {complaints.map((complaint) => {
            return (
              <div key={complaint.id} className="flex flex-col space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(complaint.supervisor.supervisorName ?? "")}
                    </AvatarFallback>
                  </Avatar>
                  <span>{complaint.supervisor.supervisorName}</span>
                </div>
                <span className="text-sm text-shamiri-text-grey">
                  {format(complaint.createdAt, "dd MMM yyyy | hh:mm a")}
                </span>
                <span className="text-shamiri-text-dark-grey">
                  {complaint.complaint}
                </span>
              </div>
            );
          })}
          {complaints.length === 0 && (
            <div className="item-center flex justify-center text-shamiri-text-dark-grey">
              No complaints found
            </div>
          )}
        </div>
        <Separator />
        <div className="space-y-5">
          <DialogFooter className="flex justify-end">
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
