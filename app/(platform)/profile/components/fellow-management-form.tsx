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

import { toast } from "#/components/ui/use-toast";

const FormSchema = z.object({
  name: z
    .string({ required_error: "Please enter a name" })
    .trim()
    .min(1, { message: "Please enter a name " }),
  age: z
    .string({ required_error: "Please enter a valid age" })
    .trim()
    .min(1, { message: "Please enter a valid age " }), // should be converted to date of birth
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a value",
  }),
  contact: z
    .string({ required_error: "Please enter a valid phone number " })
    .trim()
    .min(1, { message: "Please enter a valid age " }), // validate w/ libphonenumberjs
  mpesaName: z
    .string({ required_error: "Please enter a name" })
    .trim()
    .min(1, { message: "Please enter a name " }),
  mpesaNumber: z
    .string({ required_error: "please enter a valid phone number" })
    .trim()
    .min(1, { message: "Please enter a name " }), // validate w/ libphonenumberjs
  county: z
    .string({ required_error: "County is required" })
    .trim()
    .min(1, { message: "Please enter a valid county " }),
});

type FellowDetails = {
  fellow: {
    name: string;
    age: string;
    gender: 'male' | 'female' | 'other';
    cell_number: string;
    county: string;
    mpesa_number: string;
  };
};

export default function FellowDetailsForm(props: FellowDetails) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: props.fellow.name,
      age: props.fellow.age,
      gender: props.fellow.gender,
      contact: props.fellow.cell_number,
      mpesaName: props.fellow.name, // TODO: mpesa name not recorded
      mpesaNumber: props.fellow.mpesa_number,
      county: props.fellow.county,
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
        <div className="mt-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Papa Wemba" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Input placeholder="SHAMIRI_ID" disabled />
        </div>
        <div>
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age (should be date of birth)</FormLabel>
                <FormControl>
                  <Input placeholder="19" {...field} />
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
                <FormLabel>Gender (change to dropdown)</FormLabel>
                <FormControl>
                  <Input placeholder="Female" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact</FormLabel>
                <FormControl>
                  <Input placeholder="0717266218" {...field} />
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
                  <Input placeholder="Ken Walibora" {...field} />
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
                  <Input placeholder="0712345678" {...field} />
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
                <FormLabel>County of residence</FormLabel>
                <FormControl>
                  <Input placeholder="Nairobi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
