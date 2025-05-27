"use client";

import { CurrentHubCoordinator, CurrentSupervisor, CurrentFellow, CurrentClinicalLead, CurrentOpsUser } from "#/app/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CurrentHubCoordinator | CurrentSupervisor | CurrentFellow | CurrentClinicalLead | CurrentOpsUser | null;
}

export function ProfileDialog({ isOpen, onOpenChange, profile }: ProfileDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter name" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 