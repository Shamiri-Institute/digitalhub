"use client";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import {
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_TYPES,
} from "#/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SchoolsTableData } from "./columns";

const EditSchoolSchema = z.object({
  numbersExpected: z.coerce
    .number({
      required_error: "Please enter the promised number of students.",
    })
    .optional(),
  schoolEmail: z
    .string({
      required_error: "Please enter the school's email.",
    })
    .optional(),
  schoolCounty: z.enum(KENYAN_COUNTIES).optional(),
  schoolContact: z
    .string({
      required_error: "Please enter the school's contact number.",
    })
    .optional(),
  schoolDemographics: z.enum(SCHOOL_DEMOGRAPHICS).optional(),
  boardingDay: z.enum(BOARDING_DAY_TYPES).optional(),
  schoolType: z.enum(SCHOOL_TYPES).optional(),
});

// TODO might not make sense to resuse original schema
export default function EditSchoolDetailsForm({
  children,
  schoolInfo,
}: {
  children: React.ReactNode;
  schoolInfo: SchoolsTableData;
}) {
  const isCountySelectionValid = KENYAN_COUNTIES.some(
    (county) => county === schoolInfo.schoolCounty,
  );

  const form = useForm<z.infer<typeof EditSchoolSchema>>({
    resolver: zodResolver(EditSchoolSchema),
    defaultValues: {
      numbersExpected: schoolInfo.numbersExpected as number,
      schoolEmail: schoolInfo.schoolEmail as string,
      // @ts-ignore
      schoolCounty: schoolInfo.schoolCounty,
      // @ts-ignore
      boardingDay: schoolInfo.boardingDay,
    },
  });

  const onSubmit = (data) => console.log(data);

  return (
    <Form {...form}>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <h2>Edit School Information</h2>
              <h3>{schoolInfo.schoolName}</h3>
            </DialogHeader>
            <Separator />
            <FormField
              control={form.control}
              name="numbersExpected"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promised Number of students</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schoolEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schoolCounty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School County</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        {isCountySelectionValid ? (
                          <SelectValue placeholder="Please select county" />
                        ) : (
                          <SelectValue>{schoolInfo.schoolCounty}</SelectValue>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KENYAN_COUNTIES.map((county) => (
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
              name="schoolDemographics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Demographics</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Please select one of the options" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHOOL_DEMOGRAPHICS.map((demographic) => (
                        <SelectItem key={demographic} value={demographic}>
                          {demographic}
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
              name="boardingDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Boarding Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Please select the school boarding status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOARDING_DAY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="schoolType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Please select the school type (county, national, etc)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHOOL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <DialogFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
