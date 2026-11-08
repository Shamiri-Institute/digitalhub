"use client";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { SchoolsTableData } from "#/components/common/schools/columns";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
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
import { toast, toastOnError } from "#/components/ui/use-toast";
import {
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_TYPES,
} from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import { AddSchoolSchema, EditSchoolSchema } from "../../../app/(platform)/hc/schemas";
import { addSchool, editSchoolInformation } from "../../../app/(platform)/hc/schools/actions";
import { DISPLAY_DATE } from "#/lib/date-utils";

type FormData = z.infer<typeof AddSchoolSchema>;

type SchoolDetailsFormProps = {
  school: SchoolsTableData | null;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function SchoolDetailsForm(props: SchoolDetailsFormProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <DialogContent className="max-w-none sm:w-1/2">
        <SchoolDetailsFormContent {...props} />
      </DialogContent>
    </Dialog>
  );
}

function SchoolDetailsFormContent({ school, setOpen }: SchoolDetailsFormProps) {
  const isEditing = !!school;
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
    resolver: zodResolver(isEditing ? EditSchoolSchema : AddSchoolSchema) as Resolver<FormData>,
    defaultValues: {
      numbersExpected: school?.numbersExpected ?? undefined,
      schoolEmail: school?.schoolEmail ?? "",
      schoolDemographics: school?.schoolDemographics as
        | (typeof SCHOOL_DEMOGRAPHICS)[number]
        | undefined,
      schoolCounty: school?.schoolCounty as (typeof KENYAN_COUNTIES)[number]["name"] | undefined,
      schoolSubCounty: school?.schoolSubCounty ?? undefined,
      schoolName: school?.schoolName ?? "",
      boardingDay: school?.boardingDay as (typeof BOARDING_DAY_TYPES)[number] | undefined,
      schoolType: school?.schoolType as (typeof SCHOOL_TYPES)[number] | undefined,
      pointPersonPhone: school?.pointPersonPhone ?? undefined,
      pointPersonEmail: school?.pointPersonEmail ?? undefined,
      pointPersonName: school?.pointPersonName ?? undefined,
      principalName: school?.principalName ?? undefined,
      principalPhone: school?.principalPhone ?? undefined,
      preSessionDate: undefined,
    },
  });

  const pointPersonPhoneWatcher = form.watch("pointPersonPhone");

  const onSubmit = async (data: FormData) => {
    const pendingPointPersonPhone = pointPersonPhone.trim();
    if (pendingPointPersonPhone !== "") {
      if (!isValidPhoneNumber(pendingPointPersonPhone, "KE")) {
        form.setError("pointPersonPhone", {
          message: "Please enter a valid kenyan number",
        });
        return;
      }

      data.pointPersonPhone = data.pointPersonPhone
        ? `${data.pointPersonPhone}/${pendingPointPersonPhone}`
        : pendingPointPersonPhone;
      form.setValue("pointPersonPhone", data.pointPersonPhone);
      setPointPersonPhone("");
    }

    if (isEditing && school) {
      const pointPersonPhoneNumbers = data.pointPersonPhone
        ?.split("/")
        .filter((phone: string) => phone.trim() !== "");
      data.pointPersonPhone =
        pointPersonPhoneNumbers && pointPersonPhoneNumbers.length > 0
          ? pointPersonPhoneNumbers.join("/")
          : undefined;

      const response = await editSchoolInformation(school.id, data);

      if (!response.success) {
        toast({
          variant: "destructive",
          description: response.message ?? "Something went wrong, please try again",
        });
        return;
      }

      toast({
        description: response.message,
      });
    } else {
      const response = await addSchool(data);

      if (!response.success) {
        toast({
          variant: "destructive",
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      toast({
        description: response.message,
      });
    }

    form.reset();
    setOpen(false);
  };

  const validatePhoneNumber = (field: keyof typeof form.formState.defaultValues, value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: `${value} is not a valid kenyan number`,
      });
    }
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Edit school information" : "Add new school"}
          </DialogTitle>
        </DialogHeader>
        {isEditing && (
          <div className="pb-2 pt-4">
            <DialogAlertWidget label={school?.schoolName} separator={false} />
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
                  <FormItem required className="col-span-4">
                    <FormLabel>School name</FormLabel>
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
                  <FormItem required className="col-span-2">
                    <FormLabel>Expected no. of students</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        value={field.value ?? ""}
                        // Empty is null, not undefined: react-hook-form turns undefined back into the default.
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
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
                    <Select
                      onValueChange={(county) => {
                        field.onChange(county);
                        form.setValue("schoolSubCounty", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {field.value &&
                          !KENYAN_COUNTIES.some((county) => county.name === field.value) ? (
                            <SelectValue>{field.value}</SelectValue>
                          ) : (
                            <SelectValue placeholder="Select county" />
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
                          {field.value && !isSubCountyValid() ? (
                            <SelectValue>{field.value}</SelectValue>
                          ) : (
                            <SelectValue placeholder="Select sub-county" />
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
                    <FormItem required className="col-span-3">
                      <FormLabel>Pre-session date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                              // ARIA does not allow aria-required on a button.
                              aria-required={undefined}
                            >
                              <Icons.calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                              {field.value ? (
                                format(field.value, DISPLAY_DATE)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            captionLayout="dropdown"
                            onSelect={field.onChange}
                            autoFocus
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
                    <FormLabel>Point person name</FormLabel>
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
                    <FormLabel>Point person phone number</FormLabel>
                    <div className="flex flex-col gap-3">
                      {field.value?.split("/").map((number: string, index: number) => {
                        return (
                          // oxlint-disable-next-line react/no-array-index-key -- duplicate phone numbers would collide on number alone; index disambiguates
                          <div key={`phone-${index}-${number}`}>
                            <div
                              className={cn(
                                "flex gap-2",
                                pointPersonPhoneWatcher?.split("/")[index] === " " ? "hidden" : "",
                              )}
                            >
                              <Input
                                aria-label={`Point person phone number ${index + 1}`}
                                defaultValue={number}
                                disabled={pointPersonPhoneWatcher?.split("/")[index] === " "}
                                type="tel"
                                onChange={(e) => {
                                  const newValue = field.value?.split("/") ?? [];
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
                                    const matchIndex = pointPersonPhoneErrors.indexOf(index);
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
                                aria-label={`Remove phone number ${index + 1}`}
                                onClick={() => {
                                  const newValue = field.value?.split("/");
                                  newValue?.splice(index, 1, " ");
                                  form.setValue("pointPersonPhone", newValue?.join("/") ?? "");
                                }}
                              >
                                <Icons.minusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            {pointPersonPhoneErrors.includes(index) ? (
                              <div className="py-1">
                                <FormMessage>Please enter a valid kenyan number</FormMessage>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            onChange={(e) => {
                              setPointPersonPhone(e.target.value);
                              void form.trigger("pointPersonPhone");
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
                        </FormControl>
                        <Button
                          variant="ghost"
                          type="button"
                          className="flex items-center text-shamiri-new-blue"
                          aria-label="Add phone number"
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
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? "Save Changes" : "Add School"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
