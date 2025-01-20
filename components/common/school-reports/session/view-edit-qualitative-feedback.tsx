"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SessionReportType } from "#/app/(platform)/sc/reporting/school-reports/session/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const ConfirmReversalSchema = z.object({
  name: stringValidation("Please enter your name"),
});

export default function ViewEditQualitativeFeedback({
  children,
  sessionReport,
  action = "view",
}: {
  children: React.ReactNode;
  sessionReport: SessionReportType["session"][number];
  action: "view" | "edit";
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof ConfirmReversalSchema>>({
    resolver: zodResolver(ConfirmReversalSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof ConfirmReversalSchema>) => {
    // const response = await submitPaymentReversal({
    //   id: expense.id,
    //   name: data.name,
    // });
    // if (!response.success) {
    //   toast({
    //     variant: "destructive",
    //     title: "Submission error",
    //     description:
    //       response.message ??
    //       "Something went wrong during submission, please try again",
    //   });
    //   return;
    // }
    // toast({
    //   variant: "default",
    //   title: "Success",
    //   description: "Successfully submitted payment reversal",
    // });
    // form.reset();
    // setDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="sticky top-0 z-10 bg-white">
          <h2>{`${action === "view" ? "View" : "Edit"} school report`}</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${action === "view" ? "View" : "Edit"} school report`}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll">
          {/* code here */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
