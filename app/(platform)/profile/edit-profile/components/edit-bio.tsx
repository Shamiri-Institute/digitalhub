"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateLoggedInSupervisorDetails } from "#/app/actions";
import type { CurrentSupervisor } from "#/app/auth";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

const FormSchema = z.object({
  supervisorEmail: z
    .string({
      required_error: "Please enter your email address.",
    })
    .optional(),
  cellNumber: z
    .string({
      required_error: "Please enter your contact number.",
    })
    .optional(),
  idNumber: z
    .string({
      required_error: "Please enter your national ID.",
    })
    .optional(),
  dateOfBirth: z
    .string({
      required_error: "Please enter your date of birth.",
    })
    .transform((val) => {
      return new Date(val);
    })
    .optional(),
  gender: z
    .string({
      required_error: "Please enter gender.",
    })
    .optional(),
  mpesaNumber: z
    .string({
      required_error: "Please enter your Mpesa Number.",
    })
    .optional(),
  mpesaName: z
    .string({
      required_error: "Please enter your Mpesa Name.",
    })
    .optional(),
  bankName: z
    .string({
      required_error: "Please enter your bank name.",
    })
    .optional(),
  bankBranch: z
    .string({
      required_error: "Please enter your bank branch.",
    })
    .optional(),
  bankAccountNumber: z
    .string({
      required_error: "Please enter your bank account.",
    })
    .optional(),
  bankAccountName: z
    .string({
      required_error: "Please enter your bank account holder.",
    })
    .optional(),
  nssf: z
    .string({
      required_error: "Please enter your nssf number.",
    })
    .optional(),
  nhif: z
    .string({
      required_error: "Please enter your nhif number.",
    })
    .optional(),
  kra: z
    .string({
      required_error: "Please enter your kra number.",
    })
    .optional(),
  county: z
    .string({
      required_error: "Please enter your county.",
    })
    .optional(),
  subCounty: z
    .string({
      required_error: "Please enter your sub county.",
    })
    .optional(),
});

export default function EditProfileBio({
  supervisor,
}: {
  supervisor: Omit<
    NonNullable<CurrentSupervisor>,
    "createdAt" | "updatedAt" | "assignedSchool" | "assignedSchoolId"
  >;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const router = useRouter();
  const { toast } = useToast();

  const [gender, setGender] = useState<string>(supervisor.gender || "");

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const response = await updateLoggedInSupervisorDetails(
      supervisor.visibleId,
      {
        ...data,
        gender,
      },
    );

    if (response.supervisor) {
      toast({
        variant: "default",
        title: "Your info has been updated",
      });

      window.location.href = "/profile";
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-5  mt-2 flex items-center justify-end">
        <button onClick={() => router.back()}>
          <Icons.xIcon className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </button>
      </div>

      <Card className="mb-4 flex flex-col gap-3 bg-brand p-5 py-8 pr-3.5">
        <h3 className="text-base font-semibold text-muted-foreground">
          My Info
        </h3>
        <h3 className="text-lg font-semibold text-shamiri-light-blue ">
          {supervisor.supervisorName}
        </h3>
        <div>
          <div className="space-y-6">
            <Form {...form}>
              <form
                id="modifyFellowForm"
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error({ errors });
                })}
                className="overflow-hidden text-ellipsis px-1"
              >
                <div>
                  <div>
                    <FormField
                      control={form.control}
                      name="supervisorEmail"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="supervisorEmail"
                            name="supervisorEmail"
                            onChange={field.onChange}
                            type="email"
                            defaultValue={
                              supervisor?.supervisorEmail || field.value
                            }
                            placeholder="Personal email address"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="cellNumber"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="cellNumber"
                            name="cellNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.cellNumber || field.value}
                            placeholder="Contact number"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="idNumber"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="idNumber"
                            name="idNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.idNumber || field.value}
                            placeholder="National ID"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="my-2 text-gray-400">Date of birth</h3>
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            onChange={field.onChange}
                            defaultValue={
                              supervisor?.dateOfBirth
                                ? format(supervisor?.dateOfBirth, "yyyy-MM-dd")
                                : undefined
                            } //todo: fix the defaultValue type error
                            // defaultValue={new Date().toISOString().substring(0, 10) || field.value}
                            // defaultValue={field.value ? format(field.value, 'yyyy-MM-dd') : undefined}
                            placeholder="MM/DD/YYYY"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="my-2 text-gray-400">Gender</h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        gender === "Female" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setGender("Female");
                      }}
                    >
                      Female
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        gender === "Male" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setGender("Male");
                      }}
                    >
                      Male
                    </Button>

                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        gender === "Other" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setGender("Other");
                      }}
                    >
                      Other
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="my-2  text-gray-400">MPESA</h3>
                  <FormField
                    control={form.control}
                    name="mpesaName"
                    render={({ field }) => (
                      <div className="mt-2 grid w-full gap-1.5">
                        <Input
                          id="mpesaName"
                          name="mpesaName"
                          type="text"
                          onChange={field.onChange}
                          defaultValue={supervisor?.mpesaName || field.value}
                          placeholder="Mpesa Name"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="mpesaNumber"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="mpesaNumber"
                            name="mpesaNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={
                              supervisor?.mpesaNumber || field.value
                            }
                            placeholder="Mpesa Number"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="my-2 text-gray-400">Bank</h3>
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <div className="mt-2 grid w-full gap-1.5">
                        <Input
                          id="bankName"
                          name="bankName"
                          type="text"
                          onChange={field.onChange}
                          defaultValue={supervisor?.bankName || field.value}
                          placeholder="Bank Name"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="bankBranch"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="bankBranch"
                            name="bankBranch"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.bankBranch || field.value}
                            placeholder="Bank Branch"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="bankAccountNumber"
                            name="bankAccountNumber"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={
                              supervisor?.bankAccountNumber || field.value
                            }
                            placeholder="Branch Account"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="bankAccountName"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="bankAccountName"
                            name="bankAccountName"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={
                              supervisor?.bankAccountName || field.value
                            }
                            placeholder="Banch Account Holder"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="mt-4 text-gray-400">Statutory</h3>
                  <FormField
                    control={form.control}
                    name="nssf"
                    render={({ field }) => (
                      <div className="mt-2 grid w-full gap-1.5">
                        <Input
                          id="nssf"
                          name="nssf"
                          type="text"
                          onChange={field.onChange}
                          defaultValue={supervisor?.nssf || field.value}
                          placeholder="NSSF"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="nhif"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="nhif"
                            name="nhif"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.nhif || field.value}
                            placeholder="NHIF"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="kra"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="kra"
                            name="kra"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.kra || field.value}
                            placeholder="KRA"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="county"
                      render={({ field }) => (
                        <div className="mt-8 grid w-full gap-1.5">
                          <Input
                            id="county"
                            name="county"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.county || field.value}
                            placeholder="County"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="subCounty"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="subCounty"
                            name="subCounty"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={supervisor?.subCounty || field.value}
                            placeholder="Sub County"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                <Button
                  className="mt-4 w-full bg-shamiri-blue hover:bg-shamiri-blue"
                  type="submit"
                >
                  Save
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}
