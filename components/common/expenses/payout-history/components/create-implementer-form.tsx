"use client";

import { createImplementer } from "#/components/common/expenses/payout-history/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const createImplementerSchema = z.object({
  implementerName: stringValidation("Implementer name is required"),
  implementerType: stringValidation("Implementer type is required"),
  implementerAddress: z.string().optional(),
  pointPersonName: z.string().optional(),
  pointPersonPhone: z.string().optional(),
  pointPersonEmail: z.string().email("Invalid email address").optional(),
});

type FormValues = z.infer<typeof createImplementerSchema>;

export default function CreateImplementerForm() {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createImplementerSchema),
    defaultValues: {
      implementerName: "",
      implementerType: "",
      implementerAddress: "",
      pointPersonName: "",
      pointPersonPhone: "",
      pointPersonEmail: "",
    },
  });

  const validatePhoneNumber = (value: string) => {
    if (!isValidPhoneNumber(value, "KE") && value !== "") {
      form.setError("pointPersonPhone", {
        message: value + " is not a valid kenyan number",
      });
    } else {
      form.trigger("pointPersonPhone");
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await createImplementer(data);
      if (response.success) {
        toast({
          title: "Success",
          description: "Implementer created successfully",
        });
        form.reset();
        setIsOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to create implementer",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create implementer",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          Create Implementer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <h2 className="text-xl font-bold">Create Implementer</h2>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="implementerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Implementer Name{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter implementer name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="implementerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Implementer Type{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select implementer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NGO">NGO</SelectItem>
                        <SelectItem value="CBO">CBO</SelectItem>
                        <SelectItem value="Government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="implementerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Implementer Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="MAWEHSI GARDENS, OFF Matumbato Rd, Nairobi"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointPersonName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Point Person Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter point person name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointPersonPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Point Person Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        onBlur={(e) => validatePhoneNumber(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointPersonEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Point Person Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                loading={form.formState.isSubmitting}
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
              >
                Create Implementer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
