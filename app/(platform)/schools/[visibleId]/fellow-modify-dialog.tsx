"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
// @ts-expect-error
import { experimental_useFormState as useFormState } from "react-dom";

import { FellowDropoutDialog } from "#/app/(platform)/schools/[visibleId]/dropout-dialog";
import { addFellow } from "#/app/actions";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";

const FormSchema = z.object({
  fellowName: z.string({
    required_error: "Please enter the fellow's name.",
  }),
  fellowEmail: z.string({
    required_error: "Please enter the fellow's email.",
  }),
  cellNumber: z.string({
    required_error: "Please enter the fellow's cell phone number.",
  }),
  mpesaName: z.string({
    required_error: "Please enter the fellow's MPESA name.",
  }),
  mpesaNumber: z.string({
    required_error: "Please enter the fellow's MPESA number.",
  }),
  county: z.string({
    required_error: "Please enter the fellow's county.",
  }),
  subCounty: z.string({
    required_error: "Please enter the fellow's sub-county.",
  }),
  dateOfBirth: z.date({
    required_error: "Please enter the fellow's date of birth.",
  }),
  gender: z.string({
    required_error: "Please enter the fellow's gender.",
  }),
});

const initialState = {
  message: null,
};

export function FellowModifyDialog({
  mode,
  fellow,
  children,
}: {
  mode: "create" | "edit";
  fellow?: any;
  children: React.ReactNode;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fellowName: fellow?.fellowName,
      fellowEmail: fellow?.fellowEmail,
      cellNumber: fellow?.cellNumber,
      mpesaName: fellow?.mpesaName,
      mpesaNumber: fellow?.mpesaNumber,
      county: fellow?.county,
      subCounty: fellow?.subCounty,
      dateOfBirth: fellow?.dateOfBirth,
      gender: fellow?.gender,
    },
  });

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [state, formAction] = useFormState(addFellow, initialState);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log({ data });

    const result = formAction({
      ...data,
      hubId: fellow?.hubId,
      supervisorId: fellow?.supervisorId,
      implementerId: fellow?.implementerId,
    });
    console.log({ result });
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });

    setIsSheetOpen(false);
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-scroll" side="right">
        <SheetHeader>
          {mode === "create" && (
            <SheetTitle className="md:text-xl">Add a fellow</SheetTitle>
          )}
          {mode === "edit" && (
            <SheetTitle className="md:text-xl">{fellow.fellowName}</SheetTitle>
          )}
          {mode === "create" && (
            <SheetDescription>
              This fellow will be assigned to your hub.
            </SheetDescription>
          )}
          {mode === "edit" && (
            <SheetDescription>Shamiri ID: {fellow.visibleId}</SheetDescription>
          )}
        </SheetHeader>

        <Form {...form}>
          <form
            id="modifyFellowForm"
            onSubmit={form.handleSubmit(onSubmit)}
            action={formAction}
            className="overflow-hidden text-ellipsis px-1"
          >
            <div className="mt-6 space-y-6">
              <div>
                <FormField
                  control={form.control}
                  name="fellowName"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="fellowName">Name</Label>
                      <Input
                        id="fellowName"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="John Kenyatta"
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
                  name="fellowEmail"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="fellowEmail">Email</Label>
                      <Input
                        id="fellowEmail"
                        className="mt-1.5 resize-none bg-card"
                        placeholder="john.kenyatta@gmail.com"
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
                  name="cellNumber"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="cellNumber">Cell number</Label>
                      <Input
                        id="cellNumber"
                        placeholder="+254-700-000-000"
                        className="mt-1.5 resize-none bg-card"
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
                      <Label htmlFor="mpesaName">MPESA name</Label>
                      <Input
                        id="mpesaName"
                        placeholder="John Kenyatta"
                        className="mt-1.5 resize-none bg-card"
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
                      <Label htmlFor="mpesaNumber">MPESA number</Label>
                      <Input
                        id="mpesaNumber"
                        placeholder="+254-700-000-000"
                        className="mt-1.5 resize-none bg-card"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>
              <div>
                {/* TODO: combobox */}
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        placeholder="Nairobi"
                        className="mt-1.5 resize-none bg-card"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>
              <div>
                {/* TODO: combobox */}
                <FormField
                  control={form.control}
                  name="subCounty"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="subCounty">Sub-county</Label>
                      <Input
                        id="subCounty"
                        placeholder="Westlands"
                        className="mt-1.5 resize-none bg-card"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="dateOfBirth">Date of birth</Label>
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
                            selected={fellow?.dateOfBirth || field.value}
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
                  name="gender"
                  render={({ field }) => (
                    <div className="mt-3 grid w-full gap-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        name="gender"
                        defaultValue={fellow?.gender || field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            className="text-muted-foreground"
                            defaultValue={fellow?.gender || field.value}
                            onChange={field.onChange}
                            placeholder={
                              <span className="text-muted-foreground">
                                Select gender
                              </span>
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
              <p aria-live="polite" className="sr-only" role="status">
                {state?.message}
              </p>
              {mode === "edit" && (
                <FellowDropoutDialog fellow={fellow}>
                  <Button
                    type="submit"
                    className="w-full bg-[#AC2925] py-5 text-white transition-transform  active:scale-95"
                  >
                    Drop Out
                  </Button>
                </FellowDropoutDialog>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
