"use client";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import {
  ClinicalCases,
  getSupervisorsInHub,
  referClinicalCaseAsSupervisor,
} from "#/app/(platform)/sc/clinical/action";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const ComplaintSchema = z.object({
  referTo: z.string().min(1, "Refer to is required"),
  referralReason: z.string().min(1, "Referral reason is required"),
  message: z.string(),
  supervisorId: z.string().optional(),
});

type ComplaintFormValues = z.infer<typeof ComplaintSchema>;

const REFERRAL_OPTIONS = {
  "Clinical Lead": ["Severe risk case", "Complex high-risk case"],
  Supervisor: [
    "Ethical dilemma",
    "Student requested referral",
    "Case prioritization session referral",
  ],
};

export default function ReferClinicalCase({
  children,
  clinicalCase,
}: {
  children: React.ReactNode;
  clinicalCase: ClinicalCases;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [selectedReferTo, setSelectedReferTo] = useState<string>("");
  const [supervisorsInHub, setSupervisorsInHub] = useState<
    { id: string; name: string | null }[]
  >([]);
  const [currentSupervisor, setCurrentSupervisor] = useState<{
    id: string | undefined;
    name?: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchSupervisorsInHub = async () => {
      const data = await getSupervisorsInHub();
      setSupervisorsInHub(data?.allSupervisors ?? []);
      setCurrentSupervisor(data?.currentSupervisor ?? null);
    };
    fetchSupervisorsInHub();
  }, [selectedReferTo]);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(ComplaintSchema),
    defaultValues: {
      referTo: "",
      referralReason: "",
      message: "",
    },
  });

  const onSubmit = async (data: ComplaintFormValues) => {
    try {
      const response = await referClinicalCaseAsSupervisor({
        caseId: clinicalCase.id,
        supervisorName: currentSupervisor?.name ?? "",
        referralNotes: data.message,
        referredFromSpecified: currentSupervisor?.name ?? "",
        referredFrom: currentSupervisor?.id ?? "",
        referredToPerson:
          data.referTo === "Clinical Lead" ? null : data.supervisorId || null,
        externalCare: null,
        referTo: data.referTo,
        referralReason: data.referralReason,
        referredTo: data.referTo,
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Clinical case referred successfully",
        });
        setDialogOpen(false);
        await revalidatePageAction("hc/reporting/fellow-reports/complaints");
        form.reset();
      } else {
        toast({
          title: "Error",
          description: "Something went wrong, please try again",
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
      <DialogContent className="z-10 max-h-[90%] min-w-max overflow-x-auto bg-white p-5">
        <DialogHeader className="bg-white">
          <h2>Refer clinical case</h2>
        </DialogHeader>
        <DialogAlertWidget
          label={`${clinicalCase.pseudonym}`}
          separator={true}
        />
        <div className="min-w-max overflow-x-auto overflow-y-scroll px-[0.4rem]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="referTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Refer to
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedReferTo(value);
                        form.setValue("referralReason", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(REFERRAL_OPTIONS).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedReferTo === "Supervisor" && (
                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Select Supervisor
                        <span className="ml-1 text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supervisor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supervisorsInHub.map((supervisor) => (
                            <SelectItem
                              key={supervisor.id}
                              value={supervisor.id}
                            >
                              {supervisor.name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="referralReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Referral Reason
                      <span className="ml-1 text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedReferTo}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedReferTo &&
                          REFERRAL_OPTIONS[
                            selectedReferTo as keyof typeof REFERRAL_OPTIONS
                          ].map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-[150px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  type="submit"
                  loading={form.formState.isSubmitting}
                  disabled={form.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
