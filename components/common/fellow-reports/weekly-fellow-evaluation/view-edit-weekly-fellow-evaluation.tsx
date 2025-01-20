"use client";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { WeeklyFellowEvaluationType } from "#/components/common/fellow-reports/weekly-fellow-evaluation/actions";
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

export default function ViewEditWeeklyFellowEvaluation({
  children,
  weeklyFellowEvaluation,
  action = "view",
}: {
  children: React.ReactNode;
  weeklyFellowEvaluation: WeeklyFellowEvaluationType["week"][number];
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
