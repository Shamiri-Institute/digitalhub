"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { School } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SchoolDropoutDialog } from "#/app/(platform)/profile/myschool/school-dropout-dialog";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { FormField, Form } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { useState } from "react";
import { cn } from "#/lib/utils";
import { useToast } from "#/components/ui/use-toast";
import { revalidateFromClient } from "#/app/actions";

export const FormSchema = z.object({

  promisedNoOfStudents: z.string({
    required_error: "Please enter the promise number of students.",
  }).optional(),
  pointPersonName: z.string({
    required_error: "Please enter the point person's name.",
  }).optional(),
  pointPersonEmail: z.string({
    required_error: "Please enter the point person's email.",
  }).optional(),
  pointPersonCounty: z.string({
    required_error: "Please enter the point person's county.",
  }).optional(),
  schoolEmail: z.string({
    required_error: "Please enter the school's email.",
  }).optional(),
  schoolContact: z.string({
    required_error: "Please enter the school's contact number.",
  }).optional(),

});

export function MySchool({ school }: { school: School | null }) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const { toast } = useToast();

  const router = useRouter();
  const [schoolGender, setSchoolGender] = useState("")
  const [schoolDemographics, setSchoolDemographics] = useState<string>(school?.schoolDemographics | "")


  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // await submitTransportReimbursementRequest({
    //   supervisorId,
    //   hubId,
    //   ...data,
    // });
    console.log("onSubmit", data);

    toast({
      variant: "default",
      title: "Assigned school details updated",
    });

    await revalidateFromClient("/profile/myschool");

    form.reset();
  }

  return (
    <div className="flex flex-col">
      <div className="mb-5 mt-2 flex items-center justify-between">
        <button className="flex flex-1" onClick={() => router.back()}>
          <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </button>
      </div>
      <h3 className="mb-2 text-base font-semibold text-brand xl:text-2xl">
        My School {
          JSON.stringify(school)
        }
      </h3>
      <Card className="mb-4 flex flex-col gap-5 bg-brand p-5 py-8 pr-3.5">
        <p className="text-gray-400">Info</p>
        <h3 className="font-bold text-shamiri-light-blue xl:text-xl">
          {school?.schoolName}
        </h3>
        <div className=" space-y-6">
          <div className=" space-y-6">
            <Form {...form}>
              <form
                id="modifyFellowForm"
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error({ errors });
                })}
                className="overflow-hidden text-ellipsis px-1"
              >
                <div>
                  <FormField
                    control={form.control}
                    name="promisedNoOfStudents"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Input
                          id="promisedNoOfStudents"
                          name="promisedNoOfStudents"
                          onChange={field.onChange}
                          type="number"
                          defaultValue={school?.numbersExpected || field.value}
                          className="mt-1.5 resize-none bg-card"
                          placeholder="Promised number of students"
                          data-1p-ignore="true"
                        />
                      </div>
                    )}
                  />
                </div>
                <div>
                  <h3 className="my-6 text-gray-400">Point Person</h3>
                  <FormField
                    control={form.control}
                    name="pointPersonName"
                    render={({ field }) => (
                      <div className="mt-2 grid w-full gap-1.5">
                        <Input
                          id="pointPersonName"
                          name="pointPersonName"
                          onChange={field.onChange}
                          type="text"
                          defaultValue={school?.pointPersonName || field.value}
                          placeholder="Name"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="pointPersonEmail"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="pointPersonEmail"
                            name="pointPersonEmail"
                            type="pointPersonEmail"
                            onChange={field.onChange}
                            defaultValue={school?.pointPersonEmail || field.value}
                            placeholder="Email"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="pointPersonCounty"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="pointPersonCounty"
                            name="pointPersonCounty"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={school?.schoolCounty || field.value}
                            placeholder="County"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="my-6  text-gray-400">School</h3>
                  <FormField
                    control={form.control}
                    name="schoolEmail"
                    render={({ field }) => (
                      <div className="mt-2 grid w-full gap-1.5">
                        <Input
                          id="schoolEmail"
                          name="schoolEmail"
                          type="email"
                          onChange={field.onChange}
                          defaultValue={school?.schoolEmail || field.value}
                          placeholder="Email"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="schoolContact"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="schoolContact"
                            name="schoolContact"
                            type="text"
                            onChange={field.onChange}
                            // defaultValue={school?. || field.value}
                            placeholder="Contact number"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>


                <div>
                  <h3 className="my-6 text-gray-400">School Type</h3>
                  <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolGender === "Girls" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolGender("Girls");
                      }}
                    >
                      Girls
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolGender === "Boys" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolGender("Boys");
                      }}
                    >
                      Boys
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolGender === "Both" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolGender("Both");
                      }}
                    >
                      Both
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolDemographics === "Day" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolDemographics("Day");
                      }}
                    >
                      Day
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolDemographics === "Boarding" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolDemographics("Boarding");
                      }}
                    >
                      Boarding
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolDemographics === "Mixed" &&
                        "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolDemographics("Mixed");
                      }}
                    >
                      Mixed
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="mt-8 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker hover:text-white active:scale-95"
                  >
                    Save
                  </Button>

                </div>
              </form>
            </Form>

            {school && (
              <SchoolDropoutDialog school={school}>
                <Button
                  type="submit"
                  className="mt-2 w-full bg-shamiri-red
                             py-5 text-white transition-transform hover:bg-shamiri-red hover:text-white active:scale-95"
                >
                  Remove
                </Button>
              </SchoolDropoutDialog>
            )}
          </div>
        </div>
      </Card >
    </div >
  );
}
