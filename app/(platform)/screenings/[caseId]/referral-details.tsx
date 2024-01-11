import { Button } from "#/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useState } from "react";
import { Form, FormField } from "#/components/ui/form";
import { z } from "zod";
import { useToast } from "#/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { referClinicalCaseSupervisor } from "#/app/actions";
import { ClinicalCaseTransferTrail, ClinicalScreeningInfo, ClinicalSessionAttendance, Student, Supervisor } from "@prisma/client";

export const FormSchema = z.object({

  referredFrom: z.string({
    required_error: "Please enter the referred from.",
  }),
  referredTo: z
    .string({
      required_error: "Please enter the referred to.",
    })
  ,
  referredToPerson: z.string({
    required_error: "Please select the referred to person.",
  }),
  referralNotes: z.string({
    required_error: "Please enter the referral notes.",
  }).optional(),
  referredFromSpecified: z.string({
    required_error: "Please select the referred from specified.",
  }).optional(),

});

type CurrentCase = ClinicalScreeningInfo & {
  student: Student
  sessions: ClinicalSessionAttendance[]
  caseTransferTrail: ClinicalCaseTransferTrail[]
}
export function ReferralDetails({
  currentcase,
  supervisors,
}: {
  currentcase: CurrentCase;
  supervisors: Supervisor[];
}) {

  const { toast } = useToast();
  const [referredSelected, setReferredSelected] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      referralNotes: "",
      referredFrom: "",
      referredTo: "",
      referredToPerson: "",
      referredFromSpecified: "",
    },
  });


  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await referClinicalCaseSupervisor({
      caseId: currentcase.id,
      supervisorName,
      ...data,
      referralNotes: data.referralNotes ?? "",
      referredFromSpecified: data.referredFromSpecified ?? "",

    });

    toast({
      variant: "default",
      title: "Request for referal has been sent",
    });

    form.reset();

  }

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
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="referredFrom"
                        defaultValue={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setReferredSelected(value);
                        }}
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
                          <SelectItem value="Self">Self Referral</SelectItem>
                          <SelectItem value="Teacher">Teacher</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="AnotherStudent">Another Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

              {referredSelected == "Supervisor" && (
                <div>
                  <FormField
                    control={form.control}
                    name="referredFromSpecified"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Select
                          name="referredFromSpecified"
                          defaultValue={field.value}
                          // onValueChange={field.onChange}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSupervisorName(value);
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
                              <SelectItem key={supervisor.id} value={supervisor.supervisorName ?? ""}>{supervisor.supervisorName}</SelectItem>
                            ))}

                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                </div>
              )}

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
                          <SelectItem value="COS">COS</SelectItem>
                          <SelectItem value="External">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>


              <div>
                <FormField
                  control={form.control}
                  name="referredToPerson"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="referredToPerson"
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select Supervisor or ECP
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors.map((supervisor) => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>{supervisor.supervisorName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>

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
          {currentcase.caseTransferTrail.map((case_item, i) => (
            <SingleHistory
              key={case_item.id}
              date={case_item.date}
              referredFrom={case_item.from == "" ? case_item.fromRole : case_item.from}
              referredTo={case_item.toRole == "" ? case_item.to : case_item.toRole}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SingleHistory({
  date = new Date(),
  referredFrom = '',
  referredTo = "",
}: {
  date: Date;
  referredFrom: string;
  referredTo: string;
}) {
  return (
    <li>
      <p className="mb-2 ml-2 text-xs text-brand">
        {
          new Date(date).toLocaleDateString()
        } - Referred from {referredFrom} to {referredTo}.
      </p>
    </li>
  );
}
