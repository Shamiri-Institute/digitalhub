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
import { useEffect, useState } from "react";
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
  const [currentHubId, setCurrentHubId] = useState<string>("");

  const form = useForm<z.infer<typeof PayoutSettingsSchema>>({
    resolver: zodResolver(PayoutSettingsSchema),
    defaultValues: {
      hubId: "",
      projectSettings: [],
    },
  });

  useEffect(() => {
    if (currentHubId) {
      const hub = hubs.find((h) => h.id === currentHubId);
      setSelectedHub(hub || null);

      if (hub) {
        const projectSettings = hub.projects.map((project) => {
          const defaultRates = project.projectPaymentRates || {
            trainingSession: 0,
            preSession: 0,
            mainSession: 0,
            supervisionSession: 0,
          };

          return {
            projectId: project.id,
            sessionSettings: project.sessions.map((session) => ({
              sessionId: session.id,
              amount: session.amount || 0,
            })),
            defaultRates: {
              trainingSession: defaultRates.trainingSession,
              preSession: defaultRates.preSession,
              mainSession: defaultRates.mainSession,
              supervisionSession: defaultRates.supervisionSession,
            },
          };
        });
        form.setValue("hubId", currentHubId);
        form.setValue("projectSettings", projectSettings as never[]);
      }
    } else {
      setSelectedHub(null);
      form.setValue("hubId", "");
      form.setValue("projectSettings", []);
    }
  }, [currentHubId, hubs, form]);

  const onHubChange = (hubId: string) => {
    setCurrentHubId(hubId);
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

  const isProjectStarted = (startDate: string | null | undefined) => {
    if (!startDate) return false;
    const projectStartDate = new Date(startDate);
    const today = new Date();
    return projectStartDate <= today;
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
                selectedHub?.projects?.map((project, projectIndex) => {
                  const projectStarted = isProjectStarted(
                    project.startDate?.toISOString(),
                  );

                  return (
                    <div
                      key={project.id}
                      className={`space-y-4 rounded-lg border p-4 ${
                        projectStarted ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-shamiri-blue">
                          Project: {project.name}
                        </h4>
                        {projectStarted && (
                          <span className="text-sm font-medium text-red-500">
                            Project has already started
                          </span>
                        )}
                      </div>

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
                                    disabled={projectStarted || loading}
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
                                    disabled={projectStarted || loading}
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
                                    disabled={projectStarted || loading}
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
                                    disabled={projectStarted || loading}
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
                                    disabled={projectStarted || loading}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
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
