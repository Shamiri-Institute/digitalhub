"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import parsePhoneNumberFromString, { isValidPhoneNumber } from "libphonenumber-js";
import { usePathname } from "next/navigation";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { updateSupervisorDetails } from "#/app/(platform)/hc/supervisors/actions";
import { SupervisorContext } from "#/app/(platform)/hc/supervisors/context/supervisor-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
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
import { Popover, PopoverContent } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn } from "#/lib/utils";
import { EditSupervisorSchema } from "../../schemas";

export default function EditSupervisorDetails() {
  const context = useContext(SupervisorContext);
  const counties = KENYAN_COUNTIES.map((county) => county.name);
  const pathname = usePathname();
  const form = useForm<z.infer<typeof EditSupervisorSchema>>({
    resolver: zodResolver(EditSupervisorSchema),
  });

  const countyWatcher = form.watch("county");
  const { setValue } = form;

  // biome-ignore lint/correctness/useExhaustiveDependencies: countyWatcher is needed to trigger when county changes
  useEffect(() => {
    if (form.formState.dirtyFields.county) {
      setValue("subCounty", "");
    }
  }, [countyWatcher, setValue, form.formState.dirtyFields.county]);

  useEffect(() => {
    if (context.editDialog) {
      const defaultValues = {
        supervisorId: context.supervisor?.id ?? undefined,
        supervisorName: context.supervisor?.supervisorName ?? undefined,
        personalEmail: context.supervisor?.personalEmail ?? undefined,
        cellNumber: context.supervisor?.cellNumber ?? undefined,
        county: context.supervisor?.county ?? undefined,
        subCounty: context.supervisor?.subCounty ?? undefined,
        idNumber: context.supervisor?.idNumber ?? undefined,
        gender: context.supervisor?.gender ?? undefined,
        dateOfBirth: context.supervisor?.dateOfBirth ?? undefined,
        mpesaNumber: context.supervisor?.mpesaNumber ?? undefined,
        mpesaName: context.supervisor?.mpesaName ?? undefined,
      };

      // TODO: fix TS issue with assigning string to enum type
      // @ts-ignore
      form.reset(defaultValues);
    }
  }, [context.editDialog, context.supervisor, form]);

  const onSubmit = async (data: z.infer<typeof EditSupervisorSchema>) => {
    if (context.supervisor) {
      const response = await updateSupervisorDetails(data);
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Submission error",
          description:
            response.message ?? "Something went wrong during submission, please try again",
        });
        return;
      }

      revalidatePageAction(pathname);
      toast({
        description: response.message,
      });
      context.setEditDialog(false);
    }
  };

  const validatePhoneNumber = (field: keyof typeof form.formState.defaultValues, value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: `${value} is not a valid kenyan number`,
      });
    } else {
      form.trigger(field);
    }
  };

  return (
    <Dialog open={context.editDialog} onOpenChange={context.setEditDialog}>
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <span className="text-xl">Edit supervisor information</span>
            </DialogHeader>
            <div className="pb-2 pt-4">
              <DialogAlertWidget separator={true}>
                <div className="flex items-center gap-2">
                  <span>{context.supervisor?.supervisorName}</span>
                  <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
                  <span>
                    {context.supervisor?.cellNumber &&
                      parsePhoneNumberFromString(
                        context.supervisor?.cellNumber,
                        "KE",
                      )?.formatNational()}
                  </span>
                </div>
              </DialogAlertWidget>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Personal Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supervisorName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Full name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cellNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Phone number <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onBlur={(e) => {
                              validatePhoneNumber(
                                "cellNumber" as keyof typeof form.formState.defaultValues,
                                e.target.value,
                              );
                            }}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email address <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          National ID <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Gender <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {GENDER_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
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
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Date of birth <span className="text-shamiri-light-red">*</span>
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
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          County <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              {!countyWatcher ? (
                                <SelectValue placeholder="Select county" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {counties.map((county) => (
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
                    name="subCounty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Sub-county <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub-county" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {form.getValues("county") ? (
                              KENYAN_COUNTIES.find(
                                (county) => county.name === form.getValues("county"),
                              )?.sub_counties.map((subCounty) => {
                                return (
                                  <SelectItem key={subCounty} value={subCounty}>
                                    {subCounty}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value={" "}>Please pick a county first</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    M-PESA Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mpesaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mpesaNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          M-Pesa number <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onBlur={(e) => {
                              validatePhoneNumber(
                                "mpesaNumber" as keyof typeof form.formState.defaultValues,
                                e.target.value,
                              );
                            }}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <Input
                          id="supervisorId"
                          name="supervisorId"
                          type="hidden"
                          value={field.value}
                        />
                        <FormMessage />
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
                loading={form.formState.isSubmitting}
              >
                Update & Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
