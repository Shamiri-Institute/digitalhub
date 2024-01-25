"use client";

import Link from "next/link";
import { useState } from "react";

import { SchoolDropoutDialog } from "#/app/(platform)/profile/myschool/school-dropout-dialog";
import { undoSchoolDropout } from "#/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { School } from "@prisma/client";
import { Loader2 } from "lucide-react";

export default function SchoolCardMenu({
  school,
  children,
}: {
  school: School;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [undoingSchoolDrop, setUndoingSchoolDrop] = useState(false);

  const handleSchoolDropOut = async () => {
    try {
      setUndoingSchoolDrop(true);
      const response = await undoSchoolDropout(school.visibleId);
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Something went wrong",
        });
      } else {
        toast({
          variant: "default",
          title: "School dropout has been undone",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
      console.error(error);
    } finally {
      setUndoingSchoolDrop(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 text-sm">
        <MenuLineItem>
          <Link href={`/profile/school-report`}>Session Dates</Link>
        </MenuLineItem>

        <MenuLineItem>
          <Link href={`/profile/school-report/session?type=s0`}>
            School Report
          </Link>
        </MenuLineItem>
        <MenuLineItem>
          <Link href={`/profile/myschool`}>Edit School</Link>
        </MenuLineItem>
        <DropdownMenuSeparator className="my-2" />

        <MenuLineItem>
          {!school.droppedOut ? (
            <SchoolDropoutDialog school={school}>
              <div className="cursor-pointer">Dropout School</div>
            </SchoolDropoutDialog>
          ) : (
            <button onClick={handleSchoolDropOut}>
              <div className="flex cursor-pointer">
                {undoingSchoolDrop && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {undoingSchoolDrop ? "Undoing Dropout..." : "Undo Dropout"}
              </div>
            </button>
          )}
        </MenuLineItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLineItem({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-md p-1 hover:bg-zinc-100",
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      )}
    >
      {children}
    </div>
  );
}
