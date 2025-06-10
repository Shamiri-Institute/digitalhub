"use client";

import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { format } from "date-fns";
import parsePhoneNumberFromString from "libphonenumber-js";
import { HubsWithSchools } from "./columns";
import { Input } from "#/components/ui/input";

interface HubCoordinatorProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinator: HubsWithSchools["coordinators"][0];
  children: React.ReactNode;
}

export default function HubCoordinatorProfileDialog({
  open,
  onOpenChange,
  coordinator,
  children,
}: HubCoordinatorProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-2/5 max-w-none">
        <DialogHeader>
          <span className="text-xl">View hub coordinator</span>
        </DialogHeader>
        {children}
        <div className="space-y-6">
          <div className="flex flex-col">
            <div className="col-span-2 py-2">
              <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                Personal Information
              </span>
              <Separator />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="font-medium">Full name</div>
                <Input disabled value={coordinator?.coordinatorName} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Email address</div>
                <Input disabled value={coordinator?.coordinatorEmail ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Phone Number</div>
                <Input disabled value={(coordinator?.cellNumber && parsePhoneNumberFromString(coordinator?.cellNumber, "KE")?.formatNational()) ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">National ID</div>
                <Input disabled value={coordinator?.idNumber ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Gender</div>
                <Input disabled value={coordinator?.gender ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Date of Birth</div>
                <Input disabled value={coordinator?.dateOfBirth ? format(coordinator?.dateOfBirth, "dd/MM/yyyy") : ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">County</div>
                <Input disabled value={coordinator?.county ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Sub-county</div>
                <Input disabled value={coordinator?.subCounty ?? ""} className="mt-1" />
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="col-span-2 py-2">
              <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                Bank Information
              </span>
              <Separator />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium">Bank name</div>
                <Input disabled value={coordinator?.bankName ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Bank branch</div>
                <Input disabled value={coordinator?.bankBranch ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Account number</div>
                <Input disabled value={coordinator?.bankAccountNumber ?? ""} className="mt-1" />
              </div>
              <div>
                <div className="font-medium">Account name</div>
                <Input disabled value={coordinator?.bankAccountName ?? ""} className="mt-1" />
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-6" />
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 