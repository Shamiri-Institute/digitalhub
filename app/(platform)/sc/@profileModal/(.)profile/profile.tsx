"use client";

import { Icons } from "#/components/icons";
import { getSupervisorProfileData, updateSupervisorProfile } from "./actions";

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
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SupervisorSchema, SupervisorType } from "./schema";

import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
export default function ProfileForm({}: {}) {
  const { data: session } = useSession();
  const [loaded, setLoaded] = useState(false);
  const form = useForm<SupervisorType>({
    resolver: zodResolver(SupervisorSchema),
    defaultValues: {
      supervisorEmail: "",
      supervisorName: "",
      idNumber: "",
      cellNumber: "",
      mpesaNumber: "",
      dateOfBirth: "",
      gender: "Male",
      county: "",
      subCounty: "",
      bankName: "",
      bankBranch: "",
    },
  });
  useEffect(() => {
    (async () => {
      const profile = await getSupervisorProfileData();
      if (profile) {
        const dateValue = profile.dateOfBirth
          ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
          : "";

        form.reset({
          supervisorEmail: profile.supervisorEmail || "",
          supervisorName: profile.supervisorName || "",
          idNumber: profile.idNumber || "",
          cellNumber: profile.cellNumber || "",
          mpesaNumber: profile.mpesaNumber || "",
          dateOfBirth: dateValue,
          gender: profile.gender === "Female" ? "Female" : "Male",
          county: profile.county || "",
          subCounty: profile.subCounty || "",
          bankName: profile.bankName || "",
          bankBranch: profile.bankBranch || "",
        });
      }
      setLoaded(true);
    })();
  }, [form]);

  const countyWatcher = form.watch("county");
  useEffect(() => {
    if (form.formState.dirtyFields.county) {
      form.setValue("subCounty", "");
    }
  }, [countyWatcher, form]);

  const counties = KENYAN_COUNTIES.map((c) => c.name);

  async function onSubmit(data: SupervisorType) {
    const response = await updateSupervisorProfile(data);
    if (response?.success) {
      toast({
        title: "Success",
        variant: "default",
        description: "Profile updated successfully!",
      });
    } else {
      toast({
        title: "Update Failed",
        variant: "destructive",
        description: response?.message ?? "An error occurred.",
      });
    }
  }

  if (!loaded) {
    return null;
  }

  return (
    <Dialog>
      <DialogContent className="p-5">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <div className="font-figtree flex items-center gap-4">
            <div className="relative h-7 w-7">
              <img
                src={session?.user?.image || "/placeholder.png"}
                alt="Profile"
                className="border-gray-10 h-7 w-7 rounded-full border object-cover"
              />
            </div>
            <p className="font-figtree text-left text-[20px] font-semibold leading-[28px] text-gray-600">
              {form.watch("supervisorName") || "N/A"}
            </p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    name="supervisorEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email Address{" "}
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
                          Phone Number{" "}
                          <span className="text-shamiri-light-red">*</span>
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
                      <FormItem className="col-span-2">
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <Icons.calendar className="mr-2 h-4 w-4 text-muted-foreground" />
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
                          <SelectContent>
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
                          <SelectContent>
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
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    M-PESA Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supervisorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full Name{" "}
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
                    name="mpesaNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          M-Pesa number{" "}
                          <span className="text-shamiri-light-red">*</span>
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

              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
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
                        <FormLabel>
                          Bank Name{" "}
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
                    name="bankBranch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Bank Branch{" "}
                          <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
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
              <Button variant="outline">Cancel</Button>
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
