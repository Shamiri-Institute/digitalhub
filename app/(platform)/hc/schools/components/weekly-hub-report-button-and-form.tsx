"use client";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import Image from "next/image";
import { useState } from "react";
import AddCircleOutlined from "../../../../../public/icons/add-circle-outline.svg";

export default function WeeklyHubReportButtonAndForm() {
  const [open, setDialogOpen] = useState<boolean>(false);
  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
          <Image
            unoptimized
            priority
            src={AddCircleOutlined}
            alt="Add icon circle outlined"
            width={24}
            height={24}
          />
          Weekly Hub Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h2>Hello world</h2>
        </DialogHeader>
        <Separator />
        <div>Hello world</div>
        <DialogFooter>
          <div>Close footer</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
