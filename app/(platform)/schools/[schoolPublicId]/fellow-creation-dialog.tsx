"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent } from "#/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";
import { cn } from "#/lib/utils";

const FormSchema = z.object({
  fellowName: z.string({
    required_error: "Please enter the fellow's name.",
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

export function FellowCreationDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const school = {
    name: "Our Lady of Fatima High School",
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="md:text-xl">Create a fellow</SheetTitle>
          <SheetDescription>
            This fellow will be assigned to {school.name}
          </SheetDescription>
        </SheetHeader>
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
                    name="fellowName"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    className="mt-1.5 resize-none bg-card"
                    placeholder="John Kenyatta"
                    data-1p-ignore="true"
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
                    type="tel"
                    name="cellNumber"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="+254-700-000-000"
                    className="mt-1.5 resize-none bg-card"
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
                    name="mpesaName"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="John Kenyatta"
                    className="mt-1.5 resize-none bg-card"
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
                    name="mpesaNumber"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="+254-700-000-000"
                    className="mt-1.5 resize-none bg-card"
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
                    name="county"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="Nairobi"
                    className="mt-1.5 resize-none bg-card"
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
                    name="subCounty"
                    onChange={field.onChange}
                    defaultValue={field.value}
                    placeholder="Westlands"
                    className="mt-1.5 resize-none bg-card"
                  />
                </div>
              )}
            />
          </div>
          <div>
            {/* Draft date picker */}
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
                          format(field.value, "PPP")
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
