"use client";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const FormSchema = z.object({
  receiptDate: z
    .date({
      required_error: "Please enter the date of the receipt.",
    })
    .optional(),
  mpesaName: z.string({
    required_error: "Please enter the fellow's MPESA name.",
  }),
  mpesaNumber: z.string({
    required_error: "Please enter the fellow's MPESA number.",
  }),
  session: z.string({
    required_error: "Please select a session.",
  }),
  reason: z.string({
    required_error: "Please select a reason.",
  }),
  destination: z.string({
    required_error: "Please select a destination.",
  }),
  amount: z.string({
    required_error: "Please enter the total amount used.",
  }),
  receiptUrl: z.string({
    required_error: "Please enter the receipt url.",
  }),
});

export function RefundForm() {
  const [transportSubtype, setTransportSubtype] = useState("");
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
      receiptUrl: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // TODO : BACKEND CALL
    toast({
      variant: "default",
      title: "Request for refund has been sent",
    });
    //   form.reset();
    // if error
    // toast({
    //     variant: "destructive",
    //     title: "Something went wrong",
    // });
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
                          placeholder={
                            <span className="text-muted-foreground">
                              Select reason
                            </span>
                          }
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
                            <span className="text-muted-foreground">
                              Select session
                            </span>
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
                            <SelectItem value="data-collection">
                              Data collection
                            </SelectItem>
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
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          className="text-muted-foreground"
                          defaultValue={field.value}
                          onChange={field.onChange}
                          placeholder={
                            <span className="text-muted-foreground">
                              Select destination
                            </span>
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="hub">Hub</SelectItem>
                        <SelectItem value="main-office">Main Office</SelectItem>
                        <SelectItem value="supervision-location">
                          Supervision Location
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Input
                      id="amount"
                      className="mt-1.5 resize-none bg-card"
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

            <div>
              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <div className="mt-3 grid w-full gap-1.5">
                    <Label htmlFor="receiptUrl">Receipt Url</Label>
                    <Input
                      id="receiptUrl"
                      className="mt-1.5 resize-none bg-card"
                      placeholder="Paste G-Drive link here"
                      data-1p-ignore="true"
                      {...field}
                    />
                  </div>
                )}
              />
            </div>

            <Button
              type="submit"
              form="modifyFellowForm"
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
