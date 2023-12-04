"use client";
import { editFellowDetails } from "#/app/actions";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { EditFellowSchema } from "#/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { Fellow } from "@prisma/client";
import format from "date-fns/format";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

type FellowDetails = {
  fellow: Fellow;
  closeDialog: () => void;
};

export default function FellowDetailsForm(props: FellowDetails) {
  const form = useForm<z.infer<typeof EditFellowSchema>>({
    resolver: zodResolver(EditFellowSchema),
    defaultValues: {
      id: props.fellow.id,
      fellowName: props.fellow.fellowName ?? undefined,
      dateOfBirth: props.fellow.dateOfBirth
        ? new Date(props.fellow.dateOfBirth)
        : undefined,
      gender: props.fellow.gender ?? undefined,
      cellNumber: props.fellow.cellNumber ?? undefined,
      mpesaName: props.fellow.mpesaName ?? undefined, // TODO: mpesa name not recorded in some of the initial values
      mpesaNumber: props.fellow.mpesaNumber ?? undefined,
      county: props.fellow.county ?? undefined,
      subCounty: props.fellow.subCounty ?? undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof EditFellowSchema>) {
    const result = await editFellowDetails(data);

    if (result.success) {
      toast({
        variant: "default",
        description: "successfully edited fellow details",
      });
      props.closeDialog();
    } else {
      toast({
        variant: "destructive",
        description: "Failed to submit edits",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-xl font-medium text-shamiri-dark-blue">
          Fellow information
        </h2>
        <p className="mt-4 font-bold text-shamiri-dark-blue">
          Shamiri ID: {props.fellow.visibleId}
        </p>
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
              <FormItem className="flex flex-col">
                <FormLabel>Date of birth</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
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
        <Button
          variant="brand"
          type="submit"
          disabled={!form.formState.isDirty}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Submit
        </Button>
      </form>
    </Form>
  );
}
