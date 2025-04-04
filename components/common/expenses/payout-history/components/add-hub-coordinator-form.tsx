"use client";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
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
import { cn, stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createHubCoordinator } from "../actions";

const hubCoordinatorSchema = z.object({
  coordinatorName: stringValidation("Coordinator name is required"),
  coordinatorEmail: z.string().email("Invalid email address"),
  cellNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  mpesaNumber: z.string().min(10, "M-Pesa number must be at least 10 digits"),
  idNumber: stringValidation("ID number is required"),
  gender: z.enum(["Male", "Female"]),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  county: stringValidation("County is required"),
  subCounty: stringValidation("Sub-county is required"),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  kra: z.string().optional(),
  nhif: z.string().optional(),
  trainingLevel: z.string().optional(),
});

export type HubCoordinatorFormData = z.infer<typeof hubCoordinatorSchema>;

export default function AddHubCoordinatorForm() {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<HubCoordinatorFormData>({
    resolver: zodResolver(hubCoordinatorSchema),
  });

  const validatePhoneNumber = (
    field: keyof typeof form.formState.defaultValues,
    value: string,
  ) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: value + " is not a valid kenyan number",
      });
    } else {
      form.trigger(field);
    }
  };

  async function onSubmit(data: HubCoordinatorFormData) {
    const result = await createHubCoordinator(data);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      form.reset();
      setIsOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          Add Hub Coordinator
        </Button>
      </DialogTrigger>
      <DialogContent className="w-2/5 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <span className="text-xl">Add Hub Coordinator</span>
            </DialogHeader>
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
                    name="coordinatorName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Full name{" "}
                          <span className="text-shamiri-light-red">*</span>
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
                          Phone number{" "}
                          <span className="text-shamiri-light-red">*</span>
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
                    name="coordinatorEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email address{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
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
                          <span className="text-shamiri-light-red">*</span>
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Gender{" "}
                          <span className="text-shamiri-light-red">*</span>
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
                          <SelectContent>
                            {["Male", "Female"].map((g) => (
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
                          <span className="text-shamiri-light-red">*</span>
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
                          County{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter county" />
                        </FormControl>
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
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter sub-county" />
                        </FormControl>
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
                    name="mpesaNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          M-Pesa number{" "}
                          <span className="text-shamiri-light-red">*</span>
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
                </div>
              </div>

              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Bank Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter bank name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankBranch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Branch</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter bank branch" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter account number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankAccountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter account name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Additional Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="kra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRA PIN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter KRA PIN" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nhif"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NHIF Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter NHIF number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trainingLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Training Level</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter training level"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
              >
                Add Hub Coordinator
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
