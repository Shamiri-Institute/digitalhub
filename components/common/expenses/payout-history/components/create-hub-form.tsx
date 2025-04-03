"use client";

import { createHub } from "#/components/common/expenses/payout-history/actions";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import { Implementer, Project } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const CreateHubFormSchema = z.object({
  hubName: stringValidation("Hub name is required"),
  implementerId: z.string({
    required_error: "Implementer is required",
  }),
  projectIds: z
    .array(z.string())
    .min(1, "At least one project must be selected"),
});

type FormValues = z.infer<typeof CreateHubFormSchema>;

interface CreateHubFormProps {
  implementers: Implementer[];
  projects: Project[];
}

export default function CreateHubForm({
  implementers,
  projects,
}: CreateHubFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateHubFormSchema),
    defaultValues: {
      hubName: "",
      implementerId: "",
      projectIds: [],
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await createHub(data);
      if (response.success) {
        toast({
          title: "Hub created successfully",
          description: response.message,
        });
        form.reset();
        setIsOpen(false);
      } else {
        toast({
          title: "Error creating hub",
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
          Create Hub
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <h2 className="text-xl font-bold">Create Hub</h2>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="hubName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Hub Name <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter hub name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="implementerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Implementer{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
              name="projectIds"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Projects <span className="text-shamiri-light-red">*</span>
                    <p className="text-sm text-muted-foreground">
                      Select the projects that the hub will be responsible for.
                    </p>
                  </FormLabel>
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {projects.map((project) => (
                        <FormField
                          key={project.id}
                          control={form.control}
                          name="projectIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={project.id}
                                className="flex flex-row items-center space-x-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    className="mt-2"
                                    checked={field.value?.includes(project.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            project.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== project.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="leading-none">
                                  <FormLabel className="cursor-pointer">
                                    {project.name}
                                  </FormLabel>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Create Hub
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { CreateHubFormSchema };
