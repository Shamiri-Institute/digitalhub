"use client";

import { Alert, AlertDescription } from "#/components/ui/alert";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updatePayoutSettings } from "../actions";
import { PayoutSettingsSchema, type HubWithProjects } from "../types";

interface PayoutSettingsFormProps {
  hubs: HubWithProjects[];
}

export default function PayoutSettingsForm({ hubs }: PayoutSettingsFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHub, setSelectedHub] = useState<HubWithProjects | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof PayoutSettingsSchema>>({
    resolver: zodResolver(PayoutSettingsSchema),
    defaultValues: {
      hubId: "",
      projectSettings: [],
    },
  }) as any;

  const onHubChange = (hubId: string) => {
    const hub = hubs.find((h) => h.id === hubId);
    setSelectedHub(hub || null);

    if (hub) {
      const projectSettings = hub.projects.map((project) => ({
        projectId: project.id,
        sessionSettings: project.sessions.map((session) => ({
          sessionId: session.id,
          amount: session.amount || 0,
        })),
      }));
      form.setValue("hubId", hubId);
      form.setValue("projectSettings", projectSettings as never[]);
    }
  };

  const onSubmit = async (data: typeof PayoutSettingsSchema._type) => {
    try {
      setLoading(true);
      const result = await updatePayoutSettings(data);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setIsOpen(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error saving payout settings:", error);
      toast({
        title: "Error",
        description: "Failed to save payout settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          Payout Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <h2 className="text-xl font-bold">Payout Settings</h2>
        </DialogHeader>

        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Once this change has been made it is irreversible and will need you
            to contact support in order to modify. Please be sure of your action
            before you confirm.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="hubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hub</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={(value) => {
                      field.onChange(value);
                      onHubChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a hub" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.hubName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="font-semibold">Set Payment Rate (KES)</h3>
              {selectedHub &&
                selectedHub?.projects?.map((project, projectIndex) => (
                  <div
                    key={project.id}
                    className="space-y-4 rounded-lg border p-4"
                  >
                    <h4 className="font-medium text-shamiri-blue">
                      Project: {project.name}
                    </h4>
                    {project.sessions.length > 0 ? (
                      project.sessions.map((session, sessionIndex) => (
                        <FormField
                          key={session.id}
                          control={form.control}
                          name={
                            `projectSettings.${projectIndex}.sessionSettings.${sessionIndex}.amount` as `projectSettings.${number}.sessionSettings.${number}.amount`
                          }
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{session.sessionLabel}</FormLabel>
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
                      ))
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name={`defaultRates.${project.id}.trainingSession`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Training Session Rate{" "}
                                <span className="text-shamiri-light-red">
                                  *
                                </span>
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
                          name={`defaultRates.${project.id}.preSession`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Intervention Pre-session Rate{" "}
                                <span className="text-shamiri-light-red">
                                  *
                                </span>
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
                          name={`defaultRates.${project.id}.mainSession`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Intervention Main-session Rate{" "}
                                <span className="text-shamiri-light-red">
                                  *
                                </span>
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
                          name={`defaultRates.${project.id}.supervisionSession`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Supervision Session Rate{" "}
                                <span className="text-shamiri-light-red">
                                  *
                                </span>
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
                      </>
                    )}
                  </div>
                ))}
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
                disabled={loading}
                loading={loading}
                className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
