"use client";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteClinicalCaseSessionAttendanceDate } from "#/app/actions";
import { useToast } from "#/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const FormSchema = z.object({
  dateOfSession: z.date({
    required_error: "Please select the date of session.",
  }),
});

export function DeleteClinicalSessionDateDialog({
  sessionId,
  children,
  caseId,
}: {
  sessionId: string;
  children: React.ReactNode;
  caseId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dateOfSession: undefined,
    },
  });

  async function handleDeleteSession(sessionId: string) {
    try {
      setIsSubmitting(true);
      const response = await deleteClinicalCaseSessionAttendanceDate({
        sessionId,
      });

      if (!response.success) {
        toast({
          variant: "default",
          title: "Something went wrong, please try again",
        });
        return;
      }

      toast({
        variant: "default",
        title: "Session attendance recorded deleted successfully",
      });

      form.reset();
      setDialogOpen(false);
      window.location.href = `/screenings/${caseId}`;
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-0 p-4">
        <DialogHeader className="space-y-0 px-1 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">
              Are you sure you want to delete this session?
            </span>
          </div>
        </DialogHeader>

        <Button
          onClick={() => handleDeleteSession(sessionId)}
          className="mb-6 mt-4 w-full bg-shamiri-light-red py-5 text-white transition-transform hover:bg-shamiri-light-red active:scale-95"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
}
