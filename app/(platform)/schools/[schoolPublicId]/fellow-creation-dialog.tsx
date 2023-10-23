"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

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
  dateOfBirth: z.string({
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
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a fellow</DialogTitle>
          <DialogDescription>
            This fellow will be assigned to Our Lady of Fatima High School.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
