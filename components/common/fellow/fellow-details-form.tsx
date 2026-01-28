import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import parsePhoneNumberFromString from "libphonenumber-js";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import { FellowDetailsSchema } from "#/app/(platform)/hc/schemas";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
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
import { submitFellowDetails } from "#/lib/actions/fellow";
import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn } from "#/lib/utils";

export default function FellowDetailsForm({
  fellow,
  open,
  onOpenChange,
  mode,
  children,
}: {
  fellow?: MainFellowTableData;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  mode: "edit" | "add" | "view" | null;
  children?: React.ReactNode;
}) {
  const counties = KENYAN_COUNTIES.map((county) => county.name);
  const pathname = usePathname();
  const form = useForm<z.infer<typeof FellowDetailsSchema>>({
    resolver: zodResolver(FellowDetailsSchema),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    return {
      mode: mode ?? undefined,
      id: fellow?.id,
      fellowName: fellow?.fellowName ?? "",
      fellowEmail: fellow?.fellowEmail ?? "",
      cellNumber: fellow?.cellNumber ?? undefined,
      idNumber: fellow?.idNumber ?? undefined,
      gender: fellow?.gender ?? undefined,
      dateOfBirth: (fellow?.dateOfBirth as unknown as Date) ?? undefined,
      county: (fellow?.county as (typeof counties)[0]) ?? undefined,
      subCounty: fellow?.subCounty ?? undefined,
      mpesaName: fellow?.mpesaName ?? undefined,
      mpesaNumber: fellow?.mpesaNumber ?? undefined,
    };
  }
  const countyWatcher = form.watch("county");

  useEffect(() => {
    if (form.formState.dirtyFields.county) {
      form.setValue("subCounty", "");
    }
  }, [countyWatcher, form]);

  useEffect(() => {
    if (open) {
      let defaultValues = {};
      if (mode !== "add" && fellow) {
        defaultValues = getDefaultValues();
      } else {
        defaultValues = {
          mode,
        };
      }
      form.reset(defaultValues);
    }
  }, [open, fellow, form, mode]);

  const onSubmit = async (data: z.infer<typeof FellowDetailsSchema>) => {
    const response = await submitFellowDetails(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    await revalidatePageAction(pathname);
    toast({
      description: response.message,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn(mode === "view" ? "form-view-mode" : "")}
          >
            <DialogHeader>
              <DialogTitle className="text-xl">
                {mode === "edit"
                  ? "Edit fellow information"
                  : mode === "view"
                    ? "View fellow information"
                    : "Add new fellow"}
              </DialogTitle>
            </DialogHeader>
            {mode !== "add" && fellow && (
              <div className="pb-2 pt-4">
                <DialogAlertWidget separator={true}>
                  <div className="flex items-center gap-2">
                    <span>{fellow.fellowName}</span>
                    <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
                    <span>
                      {fellow.cellNumber &&
                        parsePhoneNumberFromString(fellow.cellNumber, "KE")?.formatNational()}
                    </span>
                  </div>
                </DialogAlertWidget>
              </div>
            )}
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
                    name="fellowName"
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Full name{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
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
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Phone number{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
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
                    name="fellowEmail"
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email address{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
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
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          National ID{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
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
                          Gender{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={mode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={mode !== "view" ? "Select gender" : ""} />
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
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        {mode !== "view" ? (
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
                                captionLayout="dropdown"
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Input
                            value={
                              field.value !== undefined
                                ? format(field.value, "dd-MM-yyyy")
                                : undefined
                            }
                            type="text"
                            disabled={mode === "view"}
                          />
                        )}
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
                          County{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={mode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              {!countyWatcher ? (
                                <SelectValue placeholder={mode !== "view" ? "Select county" : ""} />
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
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                          disabled={mode === "view"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={mode !== "view" ? "Select sub-county" : ""}
                              />
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
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full name{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
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
                    disabled={mode === "view"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          M-Pesa number{" "}
                          {mode !== "view" && <span className="text-shamiri-light-red">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              {mode !== "view" ? (
                <>
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    loading={form.formState.isSubmitting}
                  >
                    {mode === "add" ? "Add" : "Update & Save"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="brand"
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Done
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
