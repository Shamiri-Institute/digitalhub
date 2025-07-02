"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImplementerRole } from "@prisma/client";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import type {
  CurrentClinicalLead,
  CurrentClinicalTeam,
  CurrentFellow,
  CurrentHubCoordinator,
  CurrentOpsUser,
  CurrentSupervisor,
} from "#/app/auth";
import { Icons } from "#/components/icons";
import { ProfileSchema } from "#/components/profile/schema";
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
  updateClinicalLeadProfile,
  updateFellowProfile,
  updateHubCoordinatorProfile,
  updateSupervisorProfile,
} from "#/lib/actions/profile";
import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn } from "#/lib/utils";

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profile:
    | CurrentHubCoordinator
    | CurrentSupervisor
    | CurrentFellow
    | CurrentClinicalLead
    | CurrentOpsUser
    | CurrentClinicalTeam
    | null;
}

export function ProfileDialog({ isOpen, onOpenChange, profile }: ProfileDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const counties = KENYAN_COUNTIES.map((c) => c.name);

  const form = useForm<z.infer<typeof ProfileSchema>>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name:
        (profile &&
          ("coordinatorName" in profile
            ? profile.coordinatorName
            : "supervisorName" in profile
              ? profile.supervisorName
              : "fellowName" in profile
                ? profile.fellowName
                : "clinicalLeadName" in profile
                  ? profile.clinicalLeadName
                  : "name" in profile
                    ? profile.name
                    : profile.user?.user?.name)) ||
        "",
      email: profile?.user?.user?.email || "",
      idNumber: profile && "idNumber" in profile ? profile.idNumber || "" : "",
      cellNumber: profile && "cellNumber" in profile ? profile.cellNumber || "" : "",
      mpesaNumber: profile && "mpesaNumber" in profile ? profile.mpesaNumber || "" : "",
      mpesaName: profile && "mpesaName" in profile ? profile.mpesaName || "" : "",
      dateOfBirth:
        profile && "dateOfBirth" in profile && profile.dateOfBirth
          ? new Date(profile.dateOfBirth)
          : undefined,
      gender:
        profile && "gender" in profile
          ? (profile.gender as "Male" | "Female" | "Other") || "Male"
          : "Male",
      county: profile && "county" in profile ? profile.county || "" : "",
      subCounty: profile && "subCounty" in profile ? profile.subCounty || "" : "",
      bankName: profile && "bankName" in profile ? profile.bankName || "" : "",
      bankBranch: profile && "bankBranch" in profile ? profile.bankBranch || "" : "",
      bankAccountNumber:
        profile && "bankAccountNumber" in profile ? profile.bankAccountNumber || "" : "",
      bankAccountName: profile && "bankAccountName" in profile ? profile.bankAccountName || "" : "",
      kra: profile && "kra" in profile ? profile.kra || "" : "",
      role: profile?.user?.membership?.role || ImplementerRole.FELLOW,
    },
  });

  const countyWatcher = form.watch("county");

  useEffect(() => {
    if (form.formState.dirtyFields.county) {
      form.setValue("subCounty", "");
    }
  }, [countyWatcher, form]);

  const onSubmit = async (data: z.infer<typeof ProfileSchema>) => {
    if (!profile) return;
    const role = profile.user?.membership?.role;
    let response;
    switch (role) {
      case ImplementerRole.SUPERVISOR:
        response = await updateSupervisorProfile(data);
        break;
      case ImplementerRole.HUB_COORDINATOR:
        response = await updateHubCoordinatorProfile(data);
        break;
      case ImplementerRole.FELLOW:
        response = await updateFellowProfile(data);
        break;
      case ImplementerRole.CLINICAL_LEAD:
        response = await updateClinicalLeadProfile(data);
        break;
      default:
        throw new Error("Unknown or unsupported user role");
    }
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    await revalidatePageAction(pathname, "layout");
    toast({
      description: response.message,
    });
    onOpenChange(false);
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

  const showBankInfo =
    profile &&
    profile.user?.membership?.role &&
    (profile.user.membership.role === ImplementerRole.SUPERVISOR ||
      profile.user.membership.role === ImplementerRole.HUB_COORDINATOR ||
      profile.user.membership.role === ImplementerRole.CLINICAL_LEAD);

  const isFellow = profile?.user?.membership?.role === ImplementerRole.FELLOW;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-none lg:w-2/5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <span className="text-xl">{isFellow ? "View profile" : "Edit profile"}</span>
            </DialogHeader>
            <div className="flex items-center gap-2 pt-4">
              <div className="relative h-7 w-7 shrink-0">
                <Image
                  src={profile?.user?.user?.image || "/placeholder.png"}
                  alt="Profile"
                  fill
                  className="h-7 w-7 rounded-full border object-cover"
                />
              </div>
              <p className="text-wrap text-[20px] font-semibold text-gray-600">
                <span>
                  {profile &&
                    ("coordinatorName" in profile
                      ? profile.coordinatorName
                      : "supervisorName" in profile
                        ? profile.supervisorName
                        : "fellowName" in profile
                          ? profile.fellowName
                          : "clinicalLeadName" in profile
                            ? profile.clinicalLeadName
                            : "name" in profile
                              ? profile.name
                              : profile.user?.user?.name)}
                </span>
                <span className="text-[20px] font-semibold text-gray-600">
                  {" "}
                  -{" "}
                  <span className="capitalize">
                    {profile &&
                      (("assignedHub" in profile && profile.assignedHub?.hubName) ||
                        ("hub" in profile && profile.hub?.hubName))}
                  </span>
                </span>
              </p>
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
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Full name <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email address <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled />
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
                            disabled={isFellow}
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
                          National ID <span className="text-shamiri-light-red">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isFellow} />
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
                          disabled={isFellow}
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
                              disabled={isFellow}
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
                          disabled={isFellow}
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
                          disabled={isFellow}
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
              {profile && "fellowName" in profile && (
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
                            {profile?.user?.membership?.role === ImplementerRole.FELLOW && (
                              <span className="text-shamiri-light-red">*</span>
                            )}
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
                              disabled={isFellow}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mpesaName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            M-Pesa name{" "}
                            {profile?.user?.membership?.role === ImplementerRole.FELLOW && (
                              <span className="text-shamiri-light-red">*</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              {showBankInfo && (
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
                          <FormLabel>
                            Bank name
                            {showBankInfo && <span className="text-shamiri-light-red">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
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
                            Bank branch
                            {showBankInfo && <span className="text-shamiri-light-red">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
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
                          <FormLabel>
                            Account number
                            {showBankInfo && <span className="text-shamiri-light-red">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
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
                          <FormLabel>
                            Account name
                            {showBankInfo && <span className="text-shamiri-light-red">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="kra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            KRA PIN
                            {showBankInfo && <span className="text-shamiri-light-red">*</span>}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isFellow} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {isFellow ? "Done" : "Cancel"}
              </Button>
              {!isFellow && (
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
