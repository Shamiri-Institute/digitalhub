import { referClinicalCaseSupervisor } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useToast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClinicalCaseTransferTrail,
  ClinicalScreeningInfo,
  ClinicalSessionAttendance,
  Student,
  Supervisor,
} from "@prisma/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const FormSchema = z.object({
  referredTo: z.string({
    required_error: "Please enter the referred to.",
  }),
  referredToPerson: z.string({
    required_error: "Please select the referred to person.",
  }),
  referralNotes: z
    .string({
      required_error: "Please enter the referral notes.",
    })
    .optional(),
  externalCare: z
    .string({
      required_error: "Please enter the external care.",
    })
    .optional(),
});

type CurrentCase = ClinicalScreeningInfo & {
  student: Student;
  sessions: ClinicalSessionAttendance[];
  caseTransferTrail: ClinicalCaseTransferTrail[];
  currentSupervisor: Supervisor;
};
export function ReferralToDetails({
  currentcase,
  supervisors,
  currentSupId,
}: {
  currentcase: CurrentCase;
  supervisors: Supervisor[];
  currentSupId: string | undefined;
}) {
  const { toast } = useToast();
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<string>("");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      referralNotes: currentcase.referralNotes ?? "",
      referredTo: "",
      referredToPerson: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await referClinicalCaseSupervisor({
      caseId: currentcase.id,
      supervisorName: selectedSupervisor,
      ...data,
      referralNotes: data.referralNotes ?? "",
      referredFromSpecified: currentcase.currentSupervisor.supervisorName ?? "",
      referredFrom: currentSupId ?? "",
      referredToPerson:
        selectedOption !== "Supervisor" ? null : data.referredToPerson, //todo: @hinn254 update to clinical leads/external care id's once we have them
      externalCare:
        selectedOption !== "External Care" ? null : data.externalCare,
    });

    toast({
      variant: "default",
      title: "Request for referal has been sent",
    });
  }

  useEffect(() => {
    const selectedSupervisor = supervisors.filter(
      (supervisor) => supervisor.id == selectedSupervisorId,
    );
    let supervisorName = selectedSupervisor[0]?.supervisorName ?? "";
    setSelectedSupervisor(supervisorName);
  }, [selectedSupervisorId]);

  return (
    <div className="mt-2 flex flex-col gap-5 px-1">
      <div>
        <Form {...form}>
          <form
            id="submitReferralForm"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.error({ errors });
            })}
            className="overflow-hidden text-ellipsis px-1"
          >
            <div className="mt-6 space-y-6">
              <div>
                <FormField
                  control={form.control}
                  name="referredTo"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="referredTo"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedOption(value);
                          setSelectedSupervisorId("");
                          setSelectedSupervisor("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Referred To
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Shamiri Clinical Team">
                            Shamiri Clinical Team
                          </SelectItem>
                          <SelectItem value="External Care">
                            External Care
                          </SelectItem>
                          <SelectItem value="Clinical Leads">
                            Clinical Leads
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              {selectedOption == "Supervisor" && (
                <div>
                  <FormField
                    control={form.control}
                    name="referredToPerson"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Select
                          name="referredToPerson"
                          defaultValue={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedSupervisorId(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              className="text-muted-foreground"
                              defaultValue={field.value}
                              onChange={field.onChange}
                              placeholder={
                                <span className="text-muted-foreground">
                                  Select Supervisor
                                </span>
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {supervisors.map((supervisor) => (
                              <SelectItem
                                key={supervisor.id}
                                value={supervisor.id}
                              >
                                {supervisor.supervisorName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                </div>
              )}

              {selectedOption == "External Care" && (
                <div>
                  <FormField
                    control={form.control}
                    name="externalCare"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Input
                          id="externalCare"
                          className="mt-1.5 resize-none bg-card"
                          placeholder="Write external care here..."
                          data-1p-ignore="true"
                          {...field}
                        />
                      </div>
                    )}
                  />
                </div>
              )}

              <div>
                <FormField
                  control={form.control}
                  name="referralNotes"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Textarea
                        id="referralNotes"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="Write referral notes here..."
                        data-1p-ignore="true"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              <Button
                type="submit"
                form="submitReferralForm"
                className="mt-4 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
              >
                Submit Referral
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand">History</h3>
        <ul>
          {currentcase.caseTransferTrail.map((case_item, i) => {
            if (case_item.id !== currentcase.initialCaseHistoryId) {
              return (
                <SingleHistory
                  key={case_item.id}
                  date={case_item.date}
                  referredFrom={
                    case_item.from == "" ? case_item.fromRole : case_item.from
                  }
                  referredTo={
                    case_item.to == "" ? case_item.toRole : case_item.to
                  }
                />
              );
            }
          })}
        </ul>
      </div>
    </div>
  );
}

function SingleHistory({
  date = new Date(),
  referredFrom = "",
  referredTo = "",
}: {
  date: Date;
  referredFrom: string;
  referredTo: string;
}) {
  return (
    <li>
      <p className="mb-2 ml-2 text-xs text-brand">
        {new Date(date).toLocaleDateString()} - Referred from {referredFrom} to{" "}
        {referredTo}.
      </p>
    </li>
  );
}
