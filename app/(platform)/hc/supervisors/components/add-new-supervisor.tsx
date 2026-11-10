"use client";

import { format } from "date-fns";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { createNewSupervisor } from "#/app/(platform)/hc/supervisors/actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { KENYAN_COUNTIES } from "#/lib/app-constants/constants";
import { GENDER_OPTIONS } from "#/lib/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import { AddNewSupervisorSchema } from "../../schemas";
import { DISPLAY_DATE } from "#/lib/date-utils";

export default function AddNewSupervisor() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex gap-2">
          <Plus className="h-4 w-4" />
          Add supervisor
        </Button>
      </DialogTrigger>
      <DialogContent className="w-2/5 max-w-none">
        <AddNewSupervisorForm close={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AddNewSupervisorForm({ close }: { close: () => void }) {
  const counties = KENYAN_COUNTIES.map((county) => county.name);

  const form = useForm<z.infer<typeof AddNewSupervisorSchema>>({
    resolver: zodResolver(AddNewSupervisorSchema),
  });

  const countyWatcher = form.watch("county");

  const onSubmit = async (data: z.infer<typeof AddNewSupervisorSchema>) => {
    const response = await createNewSupervisor(data);
    if (!response.success) {
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong during submission, please try again",
      });
      return;
    }

    toast({
      description: response.message,
    });
    close();
  };

  const validatePhoneNumber = (field: keyof typeof form.formState.defaultValues, value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError(field, {
        message: `${value} is not a valid kenyan number`,
      });
    } else {
      void form.trigger(field);
    }
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))}>
        <DialogHeader>
          <DialogTitle className="text-xl">Add new supervisor</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-col">
            <div className="col-span-2 py-2">
              <span className="pb-2 text-xs uppercase text-muted-foreground">
                Personal Information
              </span>
              <Separator />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisorName"
                render={({ field }) => (
                  <FormItem required className="col-span-2">
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cellNumber"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={(e) => {
                          validatePhoneNumber(
                            "cellNumber" as keyof typeof form.formState.defaultValues,
                            e.target.value,
                          );
                        }}
                        type="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personalEmail"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>National ID</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
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
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Date of birth</FormLabel>
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
                            format(field.value, DISPLAY_DATE)
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
                          autoFocus
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>County</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("subCounty", "");
                      }}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          {!countyWatcher ? (
                            <SelectValue placeholder="Select county" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {counties.map((county) => (
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
                name="subCounty"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Sub-county</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-county" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {form.getValues("county") ? (
                          KENYAN_COUNTIES.find(
                            (county) => county.name === form.getValues("county"),
                          )?.sub_counties.map((subCounty) => {
                            return (
                              <SelectItem key={subCounty} value={subCounty}>
                                {subCounty}
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value={" "}>Please pick a county first</SelectItem>
                        )}
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
              <span className="pb-2 text-xs uppercase text-muted-foreground">
                M-PESA Information
              </span>
              <Separator />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mpesaName"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mpesaNumber"
                render={({ field }) => (
                  <FormItem required>
                    <FormLabel>M-Pesa number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={(e) => {
                          validatePhoneNumber(
                            "mpesaNumber" as keyof typeof form.formState.defaultValues,
                            e.target.value,
                          );
                        }}
                        type="tel"
                      />
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
            className="text-base font-semibold leading-6 text-primary hover:text-primary"
            onClick={() => {
              close();
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-primary text-base font-semibold leading-6 text-white"
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
          >
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
