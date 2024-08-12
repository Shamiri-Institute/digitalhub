"use client";

import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { toast } from "#/components/ui/use-toast";
import {
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_TYPES,
} from "#/lib/app-constants/constants";
import { getSchoolInitials } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EditSchoolSchema } from "../../schemas";
import { editSchoolInformation } from "../actions";

export default function EditSchoolDetailsForm() {
  const context = useContext(SchoolInfoContext);
  const isCountySelectionValid = KENYAN_COUNTIES.some(
    (county) => county === context.school?.schoolCounty,
  );

  const form = useForm<z.infer<typeof EditSchoolSchema>>({
    resolver: zodResolver(EditSchoolSchema),
  });

  useEffect(() => {
    const defaultValues = {
      numbersExpected: context.school?.numbersExpected ?? undefined,
      schoolEmail: context.school?.schoolEmail ?? "",
      /* TODO:
       * All the ts-ignores are for data that's meant to be some sort of enum.
       * However the prisma schema and old data in the DB forces us to make the form backwards-compatible and allow users
       * to clean up the data.
       *
       * once we clean up the data in the database and update the prisma schema then we can remove the ts-ignores
       * it's safe to assume that zod would still parse the incoming data anyway
       */
      // @ts-ignore
      schoolDemographics: context.school?.schoolDemographics,
      // @ts-ignore
      schoolCounty: context.school?.schoolCounty,
      // @ts-ignore
      boardingDay: context.school?.boardingDay,
      // @ts-ignore
      schoolType: context.school?.schoolType,
      pointPersonPhone: context.school?.pointPersonPhone ?? undefined,
      pointPersonEmail: context.school?.pointPersonEmail ?? undefined,
      pointPersonName: context.school?.pointPersonName ?? undefined,
    };
    // @ts-ignore
    form.reset(defaultValues);
  }, [context.editDialog]);

  const onSubmit = async (data: z.infer<typeof EditSchoolSchema>) => {
    if (context.school) {
      const response = await editSchoolInformation(context.school?.id, data);

      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Submission error",
          description:
            response.message ??
            "Something went wrong during submission, please try again",
        });
        return;
      }

      toast({
        description: response.message,
      });

      form.reset();
      context.setEditDialog(false);
    }
  };

  return (
    <Dialog open={context.editDialog} onOpenChange={context.setEditDialog}>
      <DialogContent className="w-1/2 max-w-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shamiri-new-light-blue p-[18px] text-xl font-semibold text-shamiri-new-blue">
                  {getSchoolInitials(context.school?.schoolName ?? "")}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-2xl font-semibold text-black">
                    {context.school?.schoolName}
                  </h2>
                  <span className="text-shamiri-text-grey">
                    Edit school information
                  </span>
                </div>
              </div>
            </DialogHeader>
            <Separator className="my-6" />
            <div className="space-y-6">
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    School Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <FormField
                    control={form.control}
                    name="numbersExpected"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Promised no. of students</FormLabel>
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
                      <FormItem className="col-span-4">
                        <FormLabel>School email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schoolDemographics"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>School demographics</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                    name="schoolCounty"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>School county</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              {isCountySelectionValid ? (
                                <SelectValue placeholder="Select county" />
                              ) : (
                                <SelectValue>
                                  {context.school?.schoolCounty}
                                </SelectValue>
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
                    name="boardingDay"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>School boarding status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                      <FormItem className="col-span-2">
                        <FormLabel>School type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                </div>
              </div>
              <div className="flex flex-col">
                <div className="col-span-2 py-2">
                  <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                    Contact Information
                  </span>
                  <Separator />
                </div>
                <div className="grid grid-cols-6 gap-4">
                  <FormField
                    control={form.control}
                    name="pointPersonName"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Point person name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pointPersonEmail"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
                        <FormLabel>Point person email</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pointPersonPhone"
                    render={({ field }) => (
                      <FormItem className="col-span-4">
                        <FormLabel>Point person phone number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                onClick={() => {
                  context.setEditDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
