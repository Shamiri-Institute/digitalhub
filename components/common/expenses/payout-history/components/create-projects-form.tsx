"use client";

import { createProject } from "#/components/common/expenses/payout-history/actions";
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
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { stringValidation } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const CreateProjectformSchema = z.object({
  projectName: stringValidation("Project name is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  implementerId: z.string({
    required_error: "Implementer is required",
  }),
  defaultRates: z.object({
    trainingSession: z.number({
      required_error: "Training session rate is required",
    }),
    preSession: z.number({
      required_error: "Pre-session rate is required",
    }),
    mainSession: z.number({
      required_error: "Main session rate is required",
    }),
    supervisionSession: z.number({
      required_error: "Supervision session rate is required",
    }),
  }),
  funder: z.string().optional(),
  budget: z.number().optional(),
  projectLead: z.string().optional(),
});

type FormValues = z.infer<typeof CreateProjectformSchema>;

export default function CreateProjectsForm() {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateProjectformSchema),
    defaultValues: {
      projectName: "",
      implementerId: "",
      startDate: new Date(),
      endDate: new Date(),
      defaultRates: {
        trainingSession: 500,
        preSession: 1000,
        mainSession: 1500,
        supervisionSession: 500,
      },
      funder: "",
      budget: undefined,
      projectLead: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await createProject(data);
      if (response.success) {
        toast({
          title: "Project created successfully",
          description: response.message,
        });
        form.reset();
        setIsOpen(false);
      } else {
        toast({
          title: "Error creating project",
          description: response.message,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <h2 className="text-xl font-bold">Create Project</h2>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="col-span-2 py-2">
              <span className="text-xs uppercase text-shamiri-text-grey">
                Project Information
              </span>
              <Separator />
            </div>
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project Name{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter project name" />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Please be as specific as possible, eg: Anansi 100K Phase 1
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Implementation Start Date{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Implementation End Date{" "}
                      <span className="text-shamiri-light-red">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="funder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funder</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter funder name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter budget amount"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectLead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Lead</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project lead name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="col-span-2 py-2">
                <span className="pb-2 text-xs uppercase text-shamiri-text-grey">
                  Set Payment Rate (KES)
                </span>
                <Separator />
              </div>
              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="defaultRates.trainingSession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Training Session Rate{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          placeholder="Enter amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultRates.preSession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Intervention Pre-session Rate{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          placeholder="Enter amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultRates.mainSession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Intervention Main-session Rate{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          placeholder="Enter amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultRates.supervisionSession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Supervision Session Rate{" "}
                        <span className="text-shamiri-light-red">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          placeholder="Enter amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateProjectformSchema };
