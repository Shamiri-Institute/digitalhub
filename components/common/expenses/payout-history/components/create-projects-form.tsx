"use client";

import { createProject } from "#/components/common/expenses/payout-history/actions";
import { HubWithProjects } from "#/components/common/expenses/payout-history/types";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { DialogContent, DialogHeader } from "#/components/ui/dialog";
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
import { Implementer } from "@prisma/client";
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
  hubIds: z.array(z.string()).min(1, "At least one hub must be selected"),
  funder: z.string().optional(),
  budget: z.number().optional(),
  projectLead: z.string().optional(),
  phase: z.string().optional(),
});

type FormValues = z.infer<typeof CreateProjectformSchema>;

export default function CreateProjectsForm({
  implementers,
  hubs,
}: {
  implementers: Implementer[];
  hubs: HubWithProjects[];
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateProjectformSchema),
    defaultValues: {
      implementerId: "",
      hubIds: [],
      funder: "",
      budget: undefined,
      projectLead: "",
      phase: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const handleImplementerChange = (value: string) => {
    form.setValue("implementerId", value);
    form.setValue("hubIds", []);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await createProject(data);
      if (response.success) {
        toast({
          title: "Project created successfully",
          description: response.message,
        });
        form.reset();
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
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <h2 className="text-xl font-bold">Create Project</h2>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Project Name <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter project name" />
                </FormControl>
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

          <FormField
            control={form.control}
            name="implementerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Implementer <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <Select
                  onValueChange={handleImplementerChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select implementer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {implementers.map((implementer) => (
                      <SelectItem key={implementer.id} value={implementer.id}>
                        {implementer.implementerName}
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
            name="hubIds"
            render={() => (
              <FormItem>
                <FormLabel>
                  Hubs <span className="text-shamiri-light-red">*</span>
                </FormLabel>
                <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                  {hubs.map((hub) => (
                    <div key={hub.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={form.watch("hubIds").includes(hub.id)}
                        onCheckedChange={(checked) => {
                          const currentHubs = form.watch("hubIds");
                          const newHubs = checked
                            ? [...currentHubs, hub.id]
                            : currentHubs.filter((id) => id !== hub.id);
                          form.setValue("hubIds", newHubs);
                        }}
                      />
                      <label className="text-sm font-medium">
                        {hub.hubName}
                      </label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

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
                          e.target.value ? parseInt(e.target.value) : undefined,
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

            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project phase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

export { CreateProjectformSchema };
