"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { School } from "@prisma/client";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useS3Upload } from "next-s3-upload";
import { useCallback, useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";

import { getSchoolsByHubId, submitTransportReimbursementRequest } from "#/app/actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Popover, PopoverContent } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

const MAX_FILE_SIZE = 2000000;
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "image/heic",
];

export const FormSchema = z.object({
  receiptDate: z
    .date({
        error: (issue) => issue.input === undefined ? "Please enter the date of the receipt." : undefined
    })
    .optional(),
  mpesaName: z.string({
      error: (issue) => issue.input === undefined ? "Please enter the fellow's MPESA name." : undefined
}),
  mpesaNumber: z
    .string({
        error: (issue) => issue.input === undefined ? "Please enter the fellow's MPESA number." : undefined
    })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
        error: "Please enter a valid Kenyan phone number (e.g. 0712345678)."
    }),
  session: z.string({
      error: (issue) => issue.input === undefined ? "Please select a session." : undefined
}),
  reason: z.string({
      error: (issue) => issue.input === undefined ? "Please select a reason." : undefined
}),
  destination: z.string({
      error: (issue) => issue.input === undefined ? "Please select a destination." : undefined
}),
  amount: z.string({
      error: (issue) => issue.input === undefined ? "Please enter the total amount used." : undefined
}),
  receiptFileKey: z
    .string({
        error: (issue) => issue.input === undefined ? "Please upload a receipt file." : undefined
    })
    .min(3, "Please upload a receipt file"),
  school: z.string({
      error: (issue) => issue.input === undefined ? "Please select a school." : undefined
}),
});

export function RefundForm({ supervisorId, hubId }: { supervisorId: string; hubId: string }) {
  const [transportSubtype, setTransportSubtype] = useState("");
  const [destination, setDestination] = useState("");
  const [hubSchools, setHubSchools] = useState<School[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      receiptDate: undefined,
      session: "",
      reason: "",
      destination: "",
      amount: "",
      mpesaName: "",
      mpesaNumber: "",
      receiptFileKey: "",
      school: "",
    },
  });

  useEffect(() => {
    const fetchHubSchools = async () => {
      const result = await getSchoolsByHubId(hubId);
      if (!result) return;
      const { schools } = result;
      if (!schools) return;
      setHubSchools(schools);
    };
    fetchHubSchools();
  }, [hubId]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await submitTransportReimbursementRequest({
      supervisorId,
      hubId,
      ...data,
    });

    toast({
      variant: "default",
      title: "Request for refund has been sent",
    });

    window.location.href = "/profile/refund";
  }

  return (
    <div>
      <Form {...form}>
        <form
          id="modifyFellowForm"
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error({ errors });
          })}
          className="overflow-hidden text-ellipsis px-1"
        >
          <div className="mt-6 space-y-6">
            <div>
              <FormField
                control={form.control}
                name="receiptDate"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
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
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Select
                      name="reason"
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTransportSubtype(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          defaultValue={field.value}
                          onChange={field.onChange}
                          placeholder={<span className="text-muted-foreground">Select reason</span>}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self">Self</SelectItem>
                        <SelectItem value="Material">Material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="session"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Select
                      name="session"
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          defaultValue={field.value}
                          onChange={field.onChange}
                          placeholder={
                            <span className="text-muted-foreground">Select session</span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {transportSubtype === "Self" ? (
                          <>
                            <SelectItem value="F1">Follow-up 1</SelectItem>
                            <SelectItem value="F2">Follow-up 2</SelectItem>
                            <SelectItem value="F3">Follow-up 3</SelectItem>
                            <SelectItem value="F4">Follow-up 4</SelectItem>
                            <SelectItem value="F5">Follow-up 5</SelectItem>
                            <SelectItem value="F6">Follow-up 6</SelectItem>
                            <SelectItem value="F7">Follow-up 7</SelectItem>
                            <SelectItem value="F8">Follow-up 8</SelectItem>
                            <SelectItem value="data-collection">Data collection</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Pre">Pre session</SelectItem>
                            <SelectItem value="S1">Session 1</SelectItem>
                            <SelectItem value="S2">Session 2</SelectItem>
                            <SelectItem value="S3">Session 3</SelectItem>
                            <SelectItem value="S4">Session 4</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Select
                      name="destination"
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setDestination(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          defaultValue={field.value}
                          onChange={field.onChange}
                          placeholder={
                            <span className="text-muted-foreground">Select destination</span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="hub">Hub</SelectItem>
                        <SelectItem value="main-office">Main Office</SelectItem>
                        <SelectItem value="supervision-location">Supervision Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>
            {destination === "school" && (
              <div>
                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Select
                        name="school"
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">Select school</span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {hubSchools.map((school: School) => (
                            <SelectItem key={school.id} value={school.schoolName}>
                              {school.schoolName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            )}

            <div>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Input
                      id="amount"
                      className="mt-1.5 resize-none bg-card"
                      type="number"
                      placeholder="Type total amount here"
                      data-1p-ignore="true"
                      {...field}
                    />
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="mpesaName"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Input
                      id="mpesaName"
                      className="mt-1.5 resize-none bg-card"
                      placeholder="Mpesa name"
                      data-1p-ignore="true"
                      {...field}
                    />
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="mpesaNumber"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Input
                      id="mpesaNumber"
                      className="mt-1.5 resize-none bg-card"
                      placeholder="Mpesa number"
                      data-1p-ignore="true"
                      {...field}
                    />
                  </div>
                )}
              />
            </div>

            <ReceiptFileUpload form={form} className="flex flex-col gap-2" />

            {Object.keys(form.formState.errors).length > 0 && (
              <div
                className="relative rounded border border-red-300 bg-red-50 px-4 py-3 text-red-500"
                role="alert"
              >
                <strong className="font-bold">Please correct the following errors:</strong>
                <ul className="list-inside list-disc">
                  {Object.entries(form.formState.errors).map(([key, value]) => (
                    <li key={key}>{value.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              type="submit"
              className="mt-4 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker active:scale-95"
            >
              Submit
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export function ReceiptFileUpload({
  form,
  className,
}: {
  form: UseFormReturn<z.infer<typeof FormSchema>>;
  className: string;
}) {
  const { FileInput, openFileDialog, uploadToS3 } = useS3Upload();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        const { key } = await uploadToS3(file, {
          endpoint: {
            request: {
              url: "/api/files/upload",
              body: {},
              headers: {},
            },
          },
        });
        if (key) {
          form.setValue("receiptFileKey", key);
          setFile(file);
        }
      } catch (error) {
        console.error("File upload error:", error);
      } finally {
        setUploading(false);
      }
    },
    [form, uploadToS3],
  );

  return (
    <div className={className}>
      <Button type="button" className="text-base font-medium" onClick={openFileDialog}>
        {uploading ? "Uploading receipt..." : "Upload receipt"}
      </Button>
      <FileInput onChange={handleFileChange} />
      {file && (
        <div>
          <span>
            {file.name} ({formatBytes(file.size)})
          </span>
        </div>
      )}
      <Input
        id="receiptFileKey"
        type="text"
        {...form.register("receiptFileKey", {
          required: "Please upload the receipt",
        })}
        className="hidden h-10 py-2"
      />
    </div>
  );
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
