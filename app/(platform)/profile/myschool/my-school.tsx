"use client";
import { SchoolDropoutDialog } from "#/app/(platform)/profile/myschool/school-dropout-dialog";
import {
  revalidateFromClient,
  updateAssignedSchoolDetails,
} from "#/app/actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { School } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const FormSchema = z.object({
  numbersExpected: z.coerce
    .number({
      required_error: "Please enter the promised number of students.",
    })
    .optional(),
  pointPersonName: z
    .string({
      required_error: "Please enter the point person's name.",
    })
    .optional(),
  pointPersonEmail: z
    .string({
      required_error: "Please enter the point person's email.",
    })
    .optional(),
  pointPersonPhone: z
    .string({
      required_error: "Please enter the point person's phone number.",
    })
    .optional(),
  pointPersonCounty: z
    .string({
      required_error: "Please enter the point person's county.",
    })
    .optional(),
  schoolEmail: z
    .string({
      required_error: "Please enter the school's email.",
    })
    .optional(),
  schoolCounty: z
    .string({
      required_error: "Please enter the school's county.",
    })
    .optional(),
  schoolContact: z
    .string({
      required_error: "Please enter the school's contact number.",
    })
    .optional(),
});

export function MySchool({ school }: { school: School | null }) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });
  const { toast } = useToast();

  const router = useRouter();

  const [schoolGender, setSchoolGender] = useState<string>(
    school?.schoolDemographics || "",
  );
  const [schoolBordingDay, setSchoolBoardingDay] = useState<string>(
    school?.boardingDay || "",
  );
  const [schoolType, setSchoolType] = useState<string>(
    school?.schoolType || "",
  );

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    let updatedData = {
      ...data,
      schoolDemographics: schoolGender,
      boardingDay: schoolBordingDay,
      schoolType,
    };

    if (!school?.visibleId) {
      return;
    }

    const response = await updateAssignedSchoolDetails(
      school?.visibleId,
      updatedData,
    );

    if (response.school) {
      toast({
        variant: "default",
        title: "Assigned school details updated",
      });

      await revalidateFromClient("/profile/myschool");

      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mb-5 mt-2 flex items-center justify-between">
        <button className="flex flex-1" onClick={() => router.back()}>
          <Icons.chevronLeft className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </button>
      </div>
      <h3 className="mb-2 text-base font-semibold text-brand xl:text-2xl">
        My School
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
                id="modifyAssignedSchoolForm"
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error({ errors });
                })}
                className="overflow-hidden text-ellipsis px-1"
              >
                <div>
                  <FormField
                    control={form.control}
                    name="numbersExpected"
                    render={({ field }) => (
                      <div className="mt-3 grid w-full gap-1.5">
                        <Input
                          id="numbersExpected"
                          name="numbersExpected"
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
                            defaultValue={
                              school?.pointPersonEmail || field.value
                            }
                            placeholder="Point Person Email"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="pointPersonPhone"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="pointPersonPhone"
                            name="pointPersonPhone"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={
                              school?.pointPersonPhone || field.value
                            }
                            placeholder="Point Person Contact Number"
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
                          placeholder="School Email"
                          className="resize-none bg-card"
                        />
                      </div>
                    )}
                  />
                  <div>
                    <FormField
                      control={form.control}
                      name="schoolCounty"
                      render={({ field }) => (
                        <div className="mt-2 grid w-full gap-1.5">
                          <Input
                            id="schoolCounty"
                            name="schoolCounty"
                            type="text"
                            onChange={field.onChange}
                            defaultValue={school?.schoolCounty || field.value}
                            placeholder="School County"
                            className="resize-none bg-card"
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="my-6 text-gray-400">School Gender</h3>
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
                        schoolGender === "Mixed" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolGender("Mixed");
                      }}
                    >
                      Mixed
                    </Button>
                  </div>
                  <h3 className="my-6 text-gray-400">School Boarding Status</h3>

                  <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolBordingDay === "Day" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolBoardingDay("Day");
                      }}
                    >
                      Day
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolBordingDay === "Boarding" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolBoardingDay("Boarding");
                      }}
                    >
                      Boarding
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolBordingDay ===
                          "Day and Boarding".toLocaleLowerCase() &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolBoardingDay(
                          "Day and Boarding".toLocaleLowerCase(),
                        );
                      }}
                    >
                      Both
                    </Button>
                  </div>
                  <h3 className="my-6 text-gray-400">School Type</h3>

                  <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolType === "County" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolType("County");
                      }}
                    >
                      County
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolType === "Sub-county" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolType("Sub-county");
                      }}
                    >
                      Sub-county
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolType === "Extra-county" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolType("Extra-county");
                      }}
                    >
                      Extra-county
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolType === "Community" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolType("Community");
                      }}
                    >
                      Community
                    </Button>
                    <Button
                      className={cn(
                        "mb-2 w-full bg-white py-5 text-gray-600 transition-transform hover:bg-white active:scale-95",
                        schoolType === "National" &&
                          "bg-shamiri-light-blue hover:bg-shamiri-light-blue",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setSchoolType("National");
                      }}
                    >
                      National
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
      </Card>
    </div>
  );
}
