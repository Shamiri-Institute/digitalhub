"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import parsePhoneNumberFromString, { isValidPhoneNumber } from "libphonenumber-js";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { updateSupervisorDetails } from "#/app/(platform)/hc/supervisors/actions";
import type { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
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

export default function SupervisorDetailsForm({
  supervisor,
  open,
  onOpenChange,
  mode = "edit",
}: {
  supervisor: SupervisorsData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "view" | "edit";
}) {
  const counties = KENYAN_COUNTIES.map((county) => county.name);
  const pathname = usePathname();
  const form = useForm<z.infer<typeof EditSupervisorSchema>>({
    resolver: zodResolver(EditSupervisorSchema),
  });

  const countyWatcher = form.watch("county");
  const isViewMode = mode === "view";

  useEffect(() => {
    if (form.formState.dirtyFields.county && !isViewMode) {
      form.setValue("subCounty", "");
    }
  }, [countyWatcher, form, isViewMode]);

  useEffect(() => {
    if (open && supervisor) {
      const defaultValues = {
        supervisorId: supervisor?.id ?? undefined,
        supervisorName: supervisor?.supervisorName ?? undefined,
        personalEmail: supervisor?.personalEmail ?? undefined,
        cellNumber: supervisor?.cellNumber ?? undefined,
        county: supervisor?.county ?? undefined,
        subCounty: supervisor?.subCounty ?? undefined,
        idNumber: supervisor?.idNumber ?? undefined,
        gender: supervisor?.gender ?? undefined,
        dateOfBirth: supervisor?.dateOfBirth ?? undefined,
        mpesaNumber: supervisor?.mpesaNumber ?? undefined,
        mpesaName: supervisor?.mpesaName ?? undefined,
      };

      form.reset(defaultValues);
    }
  }, [open, supervisor, form]);

  const onSubmit = async (data: z.infer<typeof EditSupervisorSchema>) => {
    if (supervisor) {
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

      void revalidatePageAction(pathname);
      toast({
        description: response.message,
      });
      onOpenChange(false);
    }
  };

  const validatePhoneNumber = (field: keyof typeof form.formState.defaultValues, value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: `${value} is not a valid kenyan number`,
      });
    } else {
      void form.trigger(field);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {isViewMode ? "View supervisor information" : "Edit supervisor information"}
              </DialogTitle>
            </DialogHeader>
            <div className="pb-2 pt-4">
              <DialogAlertWidget separator={true}>
                <div className="flex items-center gap-2">
                  <span>{supervisor?.supervisorName}</span>
                  <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
                  <span>
                    {supervisor?.cellNumber &&
                      parsePhoneNumberFromString(supervisor?.cellNumber, "KE")?.formatNational()}
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
                          Full name{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewMode} readOnly={isViewMode} />
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
                          Phone number{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                            onBlur={
                              !isViewMode
                                ? (e) => {
                                    validatePhoneNumber(
                                      "cellNumber" as keyof typeof form.formState.defaultValues,
                                      e.target.value,
                                    );
                                  }
                                : undefined
                            }
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
                          Email address{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                            type="email"
                          />
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
                          National ID{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                            type="text"
                          />
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
                          Gender {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={isViewMode}
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
                          Date of birth{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              disabled={isViewMode}
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
                          {!isViewMode && (
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          )}
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
                          County {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={isViewMode}
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
                          Sub-county{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={isViewMode}
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
                          Full name{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                            type="text"
                          />
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
                          M-Pesa number{" "}
                          {!isViewMode && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                            onBlur={
                              !isViewMode
                                ? (e) => {
                                    validatePhoneNumber(
                                      "mpesaNumber" as keyof typeof form.formState.defaultValues,
                                      e.target.value,
                                    );
                                  }
                                : undefined
                            }
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
                variant={isViewMode ? "brand" : "ghost"}
                type="button"
                className="text-base font-semibold leading-6"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
              {!isViewMode && (
                <Button
                  className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  loading={form.formState.isSubmitting}
                >
                  Update & Save
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
