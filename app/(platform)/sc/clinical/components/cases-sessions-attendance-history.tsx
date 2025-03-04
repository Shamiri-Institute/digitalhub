"use client";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import { attendanceColumns } from "#/app/(platform)/sc/clinical/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const ComplaintSchema = z.object({
  complaint: z.string().min(1, "Complaint is required"),
});

type ComplaintFormValues = z.infer<typeof ComplaintSchema>;

export default function ClinicalCaseSessionsAttendanceHistory({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      complaint: "",
    },
  });

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const response = {
        success: true,
        message: "Attendance history updated successfully",
      };
      if (response.success) {
        toast({
          title: "Success",
          description: "Attendance history updated successfully",
        });

        await revalidatePageAction("sc/clinical");
        setDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description:
            response.message || "Failed to update attendance history",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-10 max-h-[90%] max-w-[90vw] overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Clinical attendance history</h2>
        </DialogHeader>
        <DialogAlertWidget label={clinicalCase.pseudonym} separator={true} />
        <div className="mt-1 max-w-full overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <DataTable
            columns={attendanceColumns}
            data={clinicalCase.sessionAttendanceHistory || []}
            className={"data-table data-table-action mt-4 bg-white"}
            emptyStateMessage="No Clinical Case Attendance History"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
