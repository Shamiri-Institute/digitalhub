"use client";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
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
import { cn, stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const counties = KENYAN_COUNTIES.map((c) => c.name);

export const GenericFormSchema = z.object({
  name: stringValidation("Please enter your name"),
  email: stringValidation("Please enter your email"),
  idNumber: stringValidation("Please enter your ID Number"),
  cellNumber: z
    .string({ required_error: "Please enter the phone number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid Kenyan phone number",
    }),
  mpesaNumber: stringValidation("Please enter your mpesa number"),
  dateOfBirth: stringValidation("Please enter your date of birth").optional(),
  gender: stringValidation("Please select your gender"),
  county: z.enum([...counties] as [string, ...string[]], {
    errorMap: () => ({ message: "Please pick a valid county" }),
  }),
  subCounty: stringValidation("Please enter your sub-county"),
  bankName: stringValidation("Please enter your Bank Name"),
  bankBranch: stringValidation("Please enter your Bank Branch"),
});

export type GenericFormData = z.infer<typeof GenericFormSchema>;

type GenericProfileFormProps = {
  initialData: GenericFormData;
  onSubmit: (data: GenericFormData) => Promise<void>;
};

export default function GenericProfileForm({
  initialData,
  onSubmit,
}: GenericProfileFormProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const form = useForm<GenericFormData>({
    resolver: zodResolver(GenericFormSchema),
    defaultValues: initialData,
  });

  useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const countyWatcher = form.watch("county");
  useEffect(() => {
    if (form.formState.dirtyFields.county) {
      form.setValue("subCounty", "");
    }
  }, [countyWatcher, form]);

  async function handleSubmit(data: GenericFormData) {
    try {
      await onSubmit(data);
      toast({
        variant: "default",
        description: "Profile updated successfully!",
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error?.message ?? "An error occurred.",
      });
    }
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent className="p-5">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <div className="flex items-center gap-4">
            <div className="relative h-7 w-7">
              <img
                src={session?.user?.image || "/placeholder.png"}
                alt="Profile"
                className="h-7 w-7 rounded-full border object-cover"
              />
            </div>
            <p className="text-[20px] font-semibold text-gray-600">
              {form.getValues("name")}
            </p>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="py-2">
                  <span className="pb-2 text-xs uppercase text-gray-500">
                    Personal Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
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
                        <FormLabel>Phone Number</FormLabel>
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
                        <FormLabel>National ID</FormLabel>
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
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
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
                      <FormItem className="col-span-2">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <Icons.calendar className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(new Date(field.value), "dd/MM/yyyy")
                                  : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={(date) =>
                                field.onChange(
                                  date ? date.toISOString().split("T")[0] : "",
                                )
                              }
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
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
                      <FormItem className="w-full">
                        <FormLabel>
                          County{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select county" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {counties.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
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
                      <FormItem className="w-full">
                        <FormLabel>
                          Sub-county{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub-county" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {form.getValues("county") ? (
                              KENYAN_COUNTIES.find(
                                (county) =>
                                  county.name === form.getValues("county"),
                              )?.sub_counties.map((subCounty) => (
                                <SelectItem key={subCounty} value={subCounty}>
                                  {subCounty}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={" "}>
                                Please pick a county first
                              </SelectItem>
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
                <div className="py-2">
                  <span className="pb-2 text-xs uppercase text-gray-500">
                    M-PESA Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* FULL NAME */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
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
                        <FormLabel>M-Pesa number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="py-2">
                  <span className="pb-2 text-xs uppercase text-gray-500">
                    Bank Details
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
                          <Input {...field} />
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
                          <Input {...field} type="text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Updating..." : "Update & Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
