"use client";

import { Icons } from "#/components/icons";
import { Avatar, AvatarImage } from "#/components/ui/avatar";
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
import { DownloadIcon } from "#/components/ui/layout-icons";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
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

export const GenericFormSchema = z.object({
  email: stringValidation("Please enter your email"),
  name: stringValidation("Please enter your name"),
  idNumber: stringValidation("Please enter your ID Number"),
  cellNumber: z
    .string({ required_error: "Please enter the phone number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid Kenyan phone number",
    }),
  mpesaNumber: stringValidation("Please enter your mpesa number"),
  dateOfBirth: stringValidation("Please enter your date of birth").optional(),
  gender: stringValidation("Please select your gender"),
  county: z.enum(KENYAN_COUNTIES.map((c) => c.name) as [string, ...string[]], {
    errorMap: () => ({ message: "Please pick a valid county" }),
  }),
  subCounty: stringValidation("Please enter your sub-county"),
  bankName: stringValidation("Please enter your Bank Name"),
  bankBranch: stringValidation("Please enter your Bank Branch"),
});

export type GenericFormData = z.infer<typeof GenericFormSchema>;

export type FellowDocument = {
  id: string;
  fileName: string;
  link: string;
  type: string;
  uploadedBy: string;
  createdAt: Date;
};

type GenericProfileFormProps = {
  initialData: GenericFormData;
  onSubmit: (data: GenericFormData) => Promise<void>;
  role?: "supervisor" | "hub-coordinator" | "fellow";
  fellowDocuments?: FellowDocument[];
};

export default function GenericProfileForm({
  initialData,
  onSubmit,
  role = "supervisor",
  fellowDocuments = [],
}: GenericProfileFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isFellow = role === "fellow";
  const isReadOnlyForSupervisors =
    role === "supervisor" || role === "hub-coordinator";

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

  function maybeWrapWithTooltip(child: JSX.Element) {
    if (!isFellow) return child;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full bg-white">{child}</div>
        </TooltipTrigger>
        <TooltipContent>Contact Coordinator to edit</TooltipContent>
      </Tooltip>
    );
  }

  async function handleSubmit(data: GenericFormData) {
    try {
      await onSubmit(data);
      toast({
        variant: "default",
        description: "Profile updated successfully!",
      });
      router.back();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error?.message ?? "An error occurred.",
      });
    }
  }

  function renderDocumentSection(
    title: string,
    docType: "contract" | "identity" | "qualification",
  ) {
    const docs = fellowDocuments.filter((doc) => doc.type === docType);
    return (
      <div className="mb-4">
        <div className="py-2">
          <span className="pb-2 text-xs uppercase text-gray-500">{title}</span>
          <Separator />
        </div>
        {docs.length > 0 ? (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="mb-2 flex items-center justify-between rounded-md border border-dashed border-gray-200 p-1"
            >
              <div className="flex items-center gap-2">
                <Icons.checkCircle className="h-5 w-5 text-green-500" />
                <p>{doc.fileName}</p>
              </div>
              <Button variant="ghost" size="icon">
                <a
                  href={doc.link}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadIcon />
                </a>
              </Button>
            </div>
          ))
        ) : (
          <div className="pointer-events-none mb-2 flex items-center justify-between rounded-md border border-dashed border-gray-200 p-1 opacity-50">
            <p className="text-sm text-gray-500">
              No {title}. Contact Coordinator.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="p-5">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <div className="flex items-center gap-4">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={session?.user?.image ?? ""}
                alt={form.getValues("name")}
              />
            </Avatar>
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
                          {maybeWrapWithTooltip(
                            <Input
                              {...field}
                              disabled={isFellow || isReadOnlyForSupervisors}
                            />,
                          )}
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
                          {maybeWrapWithTooltip(
                            <Input
                              {...field}
                              type="tel"
                              disabled={isFellow || isReadOnlyForSupervisors}
                            />,
                          )}
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
                          {maybeWrapWithTooltip(
                            <Input {...field} disabled={isFellow} />,
                          )}
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
                        {isFellow ? (
                          maybeWrapWithTooltip(
                            <Select value={field.value} disabled>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                              </SelectContent>
                            </Select>,
                          )
                        ) : (
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
                        )}
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
                        {isFellow ? (
                          maybeWrapWithTooltip(
                            <Button
                              variant="outline"
                              disabled
                              className={cn(
                                "mt-1.5 w-full justify-start px-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <Icons.calendar className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(new Date(field.value), "dd/MM/yyyy")
                                : "Pick a date"}
                            </Button>,
                          )
                        ) : (
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
                                    ? format(
                                        new Date(field.value),
                                        "dd/MM/yyyy",
                                      )
                                    : "Pick a date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) =>
                                  field.onChange(
                                    date
                                      ? date.toISOString().split("T")[0]
                                      : "",
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
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>County *</FormLabel>
                        {isFellow ? (
                          maybeWrapWithTooltip(
                            <Select value={field.value} disabled>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select county" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {KENYAN_COUNTIES.map((c) => (
                                  <SelectItem key={c.name} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                          )
                        ) : (
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
                              {KENYAN_COUNTIES.map((c) => (
                                <SelectItem key={c.name} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subCounty"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Sub-county *</FormLabel>
                        {isFellow ? (
                          maybeWrapWithTooltip(
                            <Select value={field.value} disabled>
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
                                    <SelectItem
                                      key={subCounty}
                                      value={subCounty}
                                    >
                                      {subCounty}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value={" "}>
                                    Please pick a county first
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>,
                          )
                        ) : (
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
                        )}
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
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          {maybeWrapWithTooltip(
                            <Input
                              {...field}
                              disabled={isFellow || isReadOnlyForSupervisors}
                            />,
                          )}
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
                          {maybeWrapWithTooltip(
                            <Input
                              {...field}
                              type="tel"
                              disabled={isFellow || isReadOnlyForSupervisors}
                            />,
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {isFellow && (
                <div className="mt-6">
                  {renderDocumentSection("Contract Information", "contract")}
                  {renderDocumentSection("Identity Information", "identity")}
                  {renderDocumentSection(
                    "Qualification Information",
                    "qualification",
                  )}
                </div>
              )}

              {!isFellow && (
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
              )}
            </div>

            <DialogFooter className="pt-4">
              {isFellow ? (
                <Button
                  variant="default"
                  onClick={() => router.back()}
                  className="bg-shamiri-new-blue text-white hover:bg-shamiri-new-blue/90"
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="bg-shamiri-new-blue text-white hover:bg-shamiri-new-blue/90"
                  >
                    {form.formState.isSubmitting
                      ? "Updating..."
                      : "Update & Save"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
