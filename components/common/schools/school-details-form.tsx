"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { SchoolsTableData } from "#/components/common/schools/columns";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import {
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_TYPES,
} from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { AddSchoolSchema, EditSchoolSchema } from "../../../app/(platform)/hc/schemas";
import {
  addSchool,
  editSchoolInformation,
  revalidatePageAction,
} from "../../../app/(platform)/hc/schools/actions";

type FormData = z.infer<typeof AddSchoolSchema>;

export default function SchoolDetailsForm() {
  // TODO: Refactor this component to not use context
  const context = useContext(SchoolInfoContext);
  const schoolsContext = useContext(SchoolsDataContext);
  const pathname = usePathname();
  const isEditing = !!context.school;
  const isCountySelectionValid = KENYAN_COUNTIES.some(
    (county) => county.name === context.school?.schoolCounty,
  );
  const [pointPersonPhone, setPointPersonPhone] = useState<string>("");
  const [pointPersonPhoneErrors, setPointPersonPhoneErrors] = useState<number[]>([]);

  const isSubCountyValid = () => {
    const selectedCounty = KENYAN_COUNTIES.find(
      (county) => county.name === form.getValues("schoolCounty"),
    );
    if (!selectedCounty) return false;

    const subCounties: string[] = Array.from(selectedCounty.sub_counties);
    return subCounties.includes(form.getValues("schoolSubCounty") ?? "");
  };

  const form = useForm<FormData>({
    resolver: zodResolver(isEditing ? EditSchoolSchema : AddSchoolSchema),
  });

  const pointPersonPhoneWatcher = form.watch("pointPersonPhone");

  useEffect(() => {
    const defaultValues: Partial<FormData> = {
      numbersExpected: context.school?.numbersExpected ?? 0,
      schoolEmail: context.school?.schoolEmail ?? "",
      schoolDemographics: context.school?.schoolDemographics as
        | (typeof SCHOOL_DEMOGRAPHICS)[number]
        | undefined,
      schoolCounty: context.school?.schoolCounty as
        | (typeof KENYAN_COUNTIES)[number]["name"]
        | undefined,
      schoolSubCounty: context.school?.schoolSubCounty ?? undefined,
      schoolName: context.school?.schoolName ?? "",
      boardingDay: context.school?.boardingDay as (typeof BOARDING_DAY_TYPES)[number] | undefined,
      schoolType: context.school?.schoolType as (typeof SCHOOL_TYPES)[number] | undefined,
      pointPersonPhone: context.school?.pointPersonPhone ?? undefined,
      pointPersonEmail: context.school?.pointPersonEmail ?? undefined,
      pointPersonName: context.school?.pointPersonName ?? undefined,
      principalName: context.school?.principalName ?? undefined,
      principalPhone: context.school?.principalPhone ?? undefined,
      preSessionDate: undefined,
    };
    if (context.editDialog) {
      form.reset(defaultValues);
    }
  }, [context.editDialog, context.school, form]);

  const onSubmit = async (data: FormData) => {
    if (isEditing && context.school) {
      // remove empty strings (removed phone numbers)
      const pointPersonPhoneNumbers = data.pointPersonPhone
        ?.split("/")
        .filter((phone: string) => phone !== " ");
      data.pointPersonPhone =
        pointPersonPhoneNumbers && pointPersonPhoneNumbers.length > 0
          ? pointPersonPhoneNumbers.join("/")
          : undefined;

      const response = await editSchoolInformation(context.school.id, data);

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Submission error",
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      const copiedSchools = [...schoolsContext.schools];
      const index = copiedSchools.findIndex((_school) => _school.id === context.school?.id);
      if (index !== -1) {
        copiedSchools[index] = {
          ...copiedSchools[index],
          ...(data as SchoolsTableData),
        };
        context.setSchool(copiedSchools[index]!);
        schoolsContext.setSchools(copiedSchools);
        await revalidatePageAction(pathname, "layout");
      }

      toast({
        description: response.message,
      });
    } else {
      // Add new school
      const response = await addSchool(data as z.infer<typeof AddSchoolSchema>);

      if (!response.success) {
        toast({
          variant: "destructive",
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      // Add the new school to the list
      if (response.data) {
        schoolsContext.setSchools([...schoolsContext.schools, response.data]);
      }
      await revalidatePageAction(pathname, "layout");

      toast({
        description: response.message,
      });
    }

    form.reset();
    context.setEditDialog(false);
  };

  const validatePhoneNumber = (field: keyof typeof form.formState.defaultValues, value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: `${value} is not a valid kenyan number`,
      });
    }
  };

  return (
    <Dialog open={context.editDialog} onOpenChange={context.setEditDialog}>
      <DialogContent className="w-1/2 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <span className="text-xl">
                {isEditing ? "Edit school information" : "Add new school"}
              </span>
            </DialogHeader>
            {isEditing && (
              <div className="pb-2 pt-4">
                <DialogAlertWidget label={context.school?.schoolName} separator={false} />
              </div>
            )}
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    School Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-6 gap-5">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel>
                          School name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numbersExpected"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Expected no. of students <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolEmail"
                    render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel>School email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolDemographics"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>School demographics</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select demographic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SCHOOL_DEMOGRAPHICS.map((demographic) => (
                              <SelectItem key={demographic} value={demographic}>
                                {demographic}
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
                    name="schoolCounty"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>School county</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              {isCountySelectionValid ? (
                                <SelectValue placeholder="Select county" />
                              ) : (
                                <SelectValue>{context.school?.schoolCounty}</SelectValue>
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {KENYAN_COUNTIES.map((x) => x.name).map((county) => (
                              <SelectItem key={county} value={county}>
                                {county}
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
                    name="schoolSubCounty"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>School sub-county</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              {isSubCountyValid() ? (
                                <SelectValue placeholder="Select sub-county" />
                              ) : (
                                <SelectValue>{form.getValues("schoolSubCounty")}</SelectValue>
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {form.getValues("schoolCounty") ? (
                              KENYAN_COUNTIES.find(
                                (county) => county.name === form.getValues("schoolCounty"),
                              )?.sub_counties.map((subCounty) => {
                                return (
                                  <SelectItem key={subCounty} value={subCounty}>
                                    {subCounty}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="select county first">
                                Please pick a county first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="boardingDay"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>School boarding status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select boarding status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BOARDING_DAY_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
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
                    name="schoolType"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>School type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select school type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SCHOOL_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!isEditing && (
                    <FormField
                      control={form.control}
                      name="preSessionDate"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormLabel>
                            Pre-session date <span className="text-shamiri-light-red">*</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <Icons.calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {field.value ? (
                                  format(field.value, "dd/MM/yyyy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Contact Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <FormField
                    control={form.control}
                    name="principalName"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Principal name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="principalPhone"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Principal phone number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pointPersonName"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Point teacher name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pointPersonEmail"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Point person email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pointPersonPhone"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Point teacher phone number</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-3">
                            {field.value &&
                              field.value.split("/").map((number: string, index: number) => {
                                return (
                                  <div key={index}>
                                    <div
                                      className={cn(
                                        "flex gap-2",
                                        pointPersonPhoneWatcher?.split("/")[index] === " "
                                          ? "hidden"
                                          : "",
                                      )}
                                    >
                                      <Input
                                        defaultValue={number}
                                        disabled={
                                          pointPersonPhoneWatcher?.split("/")[index] === " "
                                        }
                                        type="tel"
                                        onChange={(e) => {
                                          const newValue = field.value!.split("/");
                                          newValue.splice(index, 1, e.target.value);
                                          form.setValue("pointPersonPhone", newValue.join("/"));
                                        }}
                                        onBlur={(e) => {
                                          if (
                                            !isValidPhoneNumber(e.target.value, "KE") &&
                                            e.target.value !== ""
                                          ) {
                                            const errors = [...pointPersonPhoneErrors];
                                            errors.push(index);
                                            setPointPersonPhoneErrors(errors);
                                          }

                                          if (isValidPhoneNumber(e.target.value, "KE")) {
                                            const matchIndex = pointPersonPhoneErrors.findIndex(
                                              (error) => error === index,
                                            );
                                            if (matchIndex !== -1) {
                                              const errors = [...pointPersonPhoneErrors];
                                              errors.splice(matchIndex, 1);
                                              setPointPersonPhoneErrors(errors);
                                            }
                                          }
                                        }}
                                      />
                                      <Button
                                        variant="ghost"
                                        type="button"
                                        className="flex items-center text-shamiri-light-red hover:bg-red-bg"
                                        onClick={() => {
                                          const newValue = field.value?.split("/");
                                          newValue?.splice(index, 1, " ");
                                          form.setValue(
                                            "pointPersonPhone",
                                            newValue?.join("/") ?? "",
                                          );
                                        }}
                                      >
                                        <Icons.minusCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {pointPersonPhoneErrors.includes(index) ? (
                                      <div className="py-1">
                                        <FormMessage>
                                          Please enter a valid kenyan number
                                        </FormMessage>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            <div className="flex gap-2">
                              <Input
                                onChange={(e) => {
                                  setPointPersonPhone(e.target.value);
                                  form.trigger("pointPersonPhone");
                                }}
                                onBlur={(e) => {
                                  validatePhoneNumber(
                                    "pointPersonPhone" as keyof typeof form.formState.defaultValues,
                                    e.target.value,
                                  );
                                }}
                                value={pointPersonPhone}
                                name={field.name}
                                type="tel"
                              />
                              <Button
                                variant="ghost"
                                type="button"
                                className="flex items-center text-shamiri-new-blue"
                                onClick={() => {
                                  if (isValidPhoneNumber(pointPersonPhone, "KE")) {
                                    const newValue = `${field.value}/${pointPersonPhone}`;
                                    form.setValue(
                                      "pointPersonPhone",
                                      field.value !== undefined ? newValue : pointPersonPhone,
                                    );
                                    setPointPersonPhone("");
                                  } else {
                                    form.setError("pointPersonPhone", {
                                      message: "Please enter a valid kenyan number",
                                    });
                                  }
                                }}
                              >
                                <Icons.plusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        {pointPersonPhone !== "" && <FormMessage />}
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                onClick={() => {
                  context.setEditDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditing ? "Save Changes" : "Add School"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
