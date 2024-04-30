"use client";

import { undropoutStudent } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import * as React from "react";

import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { StudentWithFellow } from "#/types/prisma";
import { Loader2 } from "lucide-react";

export function StudentUndoDropoutDialog({
  student,
  revalidationPath,
  children,
}: {
  student: StudentWithFellow;
  children: React.ReactNode;
  revalidationPath: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleUndropout = async () => {
    try {
      setIsSubmitting(true);
      const response = await undropoutStudent(student.id, revalidationPath);
      if (response.error) {
        toast({
          variant: "destructive",
          title: "Submission error",
          description: response.error,
        });
        return;
      } else {
        toast({
          title: `Undropped out ${student.studentName}`,
        });
        setDialogOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: `Something went wrong. Please try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="space-y-0 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Un-dropout {student.studentName}
            </span>
          </div>
        </DialogHeader>
        <Separator />
        <div className="my-6 space-y-6">
          <div className="px-6">
            <p className="mb-5">
              Are you sure you want to{" "}
              <span className="underline">un-dropout</span>{" "}
              <span className="font-semibold">{student.studentName}</span>?
            </p>
            <DialogFooter>
              <Button variant="base" onClick={close}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleUndropout}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
