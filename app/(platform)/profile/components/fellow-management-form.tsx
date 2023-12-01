"use client";
import { Button } from "#/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/use-toast";
import { Fellow } from "@prisma/client";
import { Loader2 } from "lucide-react";

// TODO: maybe use zod-prisma generator to remove use of this
const FormSchema = z.object({
  fellowName: z
    .string({ required_error: "Please enter a name" })
    .trim()
    .min(1, { message: "Please enter a name " })
    .nullable(),
  dateOfBirth: z.date().nullable(),
  gender: z.string().nullable(),
  cellNumber: z
    .string({ required_error: "Please enter a valid phone number " })
    .trim()
    .min(1, { message: "Please enter a valid age " }) // validate w/ libphonenumberjs
    .nullable(),
  mpesaName: z
    .string({ required_error: "Please enter a name" })
    .trim()
    .min(1, { message: "Please enter a name " })
    .nullable(),
  mpesaNumber: z
    .string({ required_error: "please enter a valid phone number" })
    .trim()
    .min(1, { message: "Please enter a name " }) // validate w/ libphonenumberjs
    .nullable(),
  county: z
    .string({ required_error: "County is required" })
    .trim()
    .min(1, { message: "Please enter a valid county " })
    .nullable(),
  subCounty: z
    .string({ required_error: "County is required" })
    .trim()
    .min(1, { message: "Please enter a valid county " })
    .nullable(),
});

type FellowDetails = {
  fellow: Fellow;
};

export default function FellowDetailsForm(props: FellowDetails) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fellowName: props.fellow.fellowName,
      dateOfBirth: props.fellow.dateOfBirth,
      gender: props.fellow.gender,
      cellNumber: props.fellow.cellNumber,
      mpesaName: props.fellow.mpesaName, // TODO: mpesa name not recorded in some of the initial values
      mpesaNumber: props.fellow.mpesaNumber,
      county: props.fellow.county,
      subCounty: props.fellow.subCounty,
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
        <h2>Fellow information</h2>
        <p className="mt-4">ShamirI ID: sham_123</p>
        <div className="mt-8">
          <FormField
            control={form.control}
            name="fellowName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Papa Wemba"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age (should be date of birth)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="19"
                    type="text"
                    {...field}
                    value={
                      field.value
                        ? field.value.toString()
                        : new Date().toString()
                    }
                  />
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
                  defaultValue={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="O">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cellNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0717266218"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          <FormField
            control={form.control}
            name="mpesaName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MPESA name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ken Walibora"
                    {...field}
                    value={field.value || ""}
                  />
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
                <FormLabel>MPESA Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0712345678"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          <FormField
            control={form.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel>County</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nairobi"
                    {...field}
                    value={field.value ?? ""}
                  />
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
                <FormLabel>Sub county</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Kamkunji"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={!form.formState.isDirty}>
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Submit
        </Button>
      </form>
    </Form>
  );
}
