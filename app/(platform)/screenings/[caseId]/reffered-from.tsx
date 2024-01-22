import { initialReferralFromClinicalCaseSupervisor } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useToast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClinicalCaseTransferTrail,
  ClinicalScreeningInfo,
  ClinicalSessionAttendance,
  Fellow,
  Student,
  Supervisor,
} from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const FormSchema = z.object({
  referredFrom: z
    .string({
      required_error: "Please enter the referred from.",
    })
    .trim()
    .min(1, {
      message: "Required. Please select the initial contact person.",
    }),
  supervisor: z
    .string({
      required_error: "Please enter the supervisor.",
    })
    .optional(),
  fellow: z
    .string({
      required_error: "Please enter the fellow.",
    })
    .optional(),
  other: z
    .string({
      required_error: "Please enter the other.",
    })
    .optional(),
});

type CurrentCase = ClinicalScreeningInfo & {
  student: Student;
  sessions: ClinicalSessionAttendance[];
  caseTransferTrail: ClinicalCaseTransferTrail[];
  currentSupervisor: Supervisor;
};

type SupervisorWithFellows = Supervisor & {
  fellows: Fellow[];
};

export function ReferralFrom({
  currentcase,
  supervisors,
  currentSupId,
}: {
  currentcase: CurrentCase;
  supervisors: SupervisorWithFellows[];
  currentSupId: string | undefined;
}) {
  const { toast } = useToast();
  const [referredSelected, setReferredSelected] = useState<string>("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<
    SupervisorWithFellows[]
  >([]);

  const referralFrom = currentcase.caseTransferTrail.filter(
    (case_item) => case_item.id === currentcase.initialCaseHistoryId,
  )[0];

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      referredFrom: "",
      supervisor: "",
      fellow: "",
      other: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (
      (data.referredFrom == "Fellow" && data.fellow == "") ||
      (data.referredFrom == "Fellow" && data.supervisor == "")
    ) {
      toast({
        variant: "destructive",
        title: "Please select a fellow or supervisor",
      });
      return;
    }

    try {
      const response = await initialReferralFromClinicalCaseSupervisor({
        caseId: currentcase.id,
        referredFrom: data.referredFrom, //supervisor or fellow or teacher
        referredFromSpecified: data.fellow ?? "", // like fellow name but blank if not
        referredTo:
          currentcase?.currentSupervisor?.supervisorName || "Supervisor", // since its the logged in supervisor
        referredToSpecified: data.other
          ? data.other
          : currentcase?.currentSupervisor?.supervisorName ?? "",
        supervisorId: currentSupId ?? "",
        initialCaseId: currentcase.initialCaseHistoryId ?? "",
      });

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Something went wrong, please try again",
        });
        return;
      }

      toast({
        variant: "default",
        title: "Initial case history recorded successfully",
      });

      form.reset();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    const selectedSupervisor = supervisors.filter(
      (supervisor) => supervisor.id == selectedSupervisorId,
    );
    setSelectedSupervisor(selectedSupervisor);
  }, [selectedSupervisorId, supervisors]);

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
                  name="referredFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="mt-3 grid w-full gap-1.5">
                          <Select
                            name="referredFrom"
                            // defaultValue={field.value}
                            defaultValue={referralFrom?.fromRole ?? field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setReferredSelected(value);

                              if (value != "Fellow") {
                                setSelectedSupervisorId("");
                                setSelectedSupervisor([]);
                              }
                            }}
                            disabled={
                              !!currentcase.initialCaseHistoryOwnerId &&
                              currentcase.initialCaseHistoryOwnerId !==
                                currentSupId
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                className="text-muted-foreground"
                                defaultValue={field.value}
                                onChange={field.onChange}
                                placeholder={
                                  <span className="text-muted-foreground">
                                    Referred From
                                  </span>
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Fellow">Fellow</SelectItem>
                              <SelectItem value="Self Referral">
                                Self Referral
                              </SelectItem>
                              <SelectItem value="Teacher">Teacher</SelectItem>
                              <SelectItem value="AnotherStudent">
                                Another Student
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {referredSelected == "Fellow" && (
                <div>
                  <FormField
                    control={form.control}
                    name="supervisor"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="mt-3 grid w-full gap-1.5">
                            <Select
                              name="supervisor"
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
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              {referredSelected == "Other" && (
                <div>
                  <FormField
                    control={form.control}
                    name="other"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="mt-3 grid w-full gap-1.5">
                            <Input
                              id="other"
                              className="mt-1.5 resize-none bg-card"
                              type="text"
                              placeholder="How did you get the case here..."
                              data-1p-ignore="true"
                              required
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {selectedSupervisor.length > 0 && (
                <div>
                  <FormField
                    control={form.control}
                    name="fellow"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="mt-3 grid w-full gap-1.5">
                            <Select
                              name="fellow"
                              defaultValue={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  className="text-muted-foreground"
                                  defaultValue={field.value}
                                  onChange={field.onChange}
                                  placeholder={
                                    <span className="text-muted-foreground">
                                      Select Fellows
                                    </span>
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedSupervisor[0]?.fellows.map(
                                  (fellow) => (
                                    <SelectItem
                                      key={fellow.id}
                                      value={fellow.fellowName ?? ""}
                                    >
                                      {fellow.fellowName}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type="submit"
                form="submitReferralForm"
                className="mt-4 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                disabled={
                  !!currentcase.initialCaseHistoryOwnerId &&
                  currentcase.initialCaseHistoryOwnerId !== currentSupId
                }
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand">
          Initial case history
        </h3>
        <ul>
          {currentcase.caseTransferTrail.map((case_item, i) => {
            if (case_item.id === currentcase.initialCaseHistoryId) {
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
        {referredFrom === "Other"
          ? `${new Date(
              date,
            ).toLocaleDateString()}  Referred from ${referredFrom} reason: ${referredTo}`
          : `${new Date(
              date,
            ).toLocaleDateString()} - Referred from ${referredFrom} to ${referredTo}.`}
      </p>
    </li>
  );
}
