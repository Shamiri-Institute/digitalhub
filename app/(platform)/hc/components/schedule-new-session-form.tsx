"use client";
import HubCoordinatorContext from "#/app/(platform)/hc/context/hub-coordinator";
import { Icons } from "#/components/icons";
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
import { Popover, PopoverContent } from "#/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ScheduleNewSessionSchema } from "../schemas";

export function ScheduleNewSession() {
  const { hubCoordinator } = useContext(HubCoordinatorContext);
  const form = useForm<z.infer<typeof ScheduleNewSessionSchema>>({
    resolver: zodResolver(ScheduleNewSessionSchema),
    defaultValues: {
      sessionType: "s0",
      sessionDuration: "1h",
    },
  });

  const onSubmit = async (data: z.infer<typeof ScheduleNewSessionSchema>) => {
    console.log(data);
    // const response = await dropoutSchool(data.schoolId, data.dropoutReason);
    // console.log(response);
    //
    // if (!response.success) {
    //   toast({
    //     variant: "destructive",
    //     title: "Submission Error",
    //     description:
    //       response.message ??
    //       "Something went wrong during submission, please try again",
    //   });
    //   return;
    // }
    //
    // toast({
    //   variant: "default",
    //   title: "Success",
    //   description: `Successfully droppedout ${schoolName}`,
    // });
    // form.reset();
  };

  useEffect(() => {
    console.log(hubCoordinator);
  }, [hubCoordinator]);

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="sessionType"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>Select a session type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SESSION_TYPES.map((session) => (
                  <SelectItem key={session.name} value={session.name}>
                    Intervention group session -{" "}
                    {session.description.toUpperCase()}
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
        name="school"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>
              Select school <span className="text-shamiri-light-red">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {hubCoordinator &&
                  hubCoordinator.assignedHub &&
                  hubCoordinator.assignedHub.schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="sessionDate"
          render={({ field }) => (
            <div>
              <FormLabel>
                Date <span className="text-shamiri-light-red">*</span>
              </FormLabel>
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
                      format(field.value, "dd/MM/yyyy")
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="sessionStartTime"
          render={({ field }) => (
            <div>
              <FormLabel>Start time</FormLabel>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                onChange={(e) => {
                  console.log(e.target.value);
                }}
                min="06:00"
                max="18:00"
                defaultValue="06:00"
                className="mt-1.5 w-full appearance-none"
              />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="sessionDuration"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Duration</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["1h", "1h 15m", "1h 30m", "1h 45m"].map(
                    (time, index: number) => (
                      <SelectItem key={index.toString()} value={time}>
                        {time}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <div>
              <FormLabel>Notification</FormLabel>
              <ToggleGroup
                type="single"
                defaultValue={field.value}
                onValueChange={field.onChange}
                className="form-toggle"
              >
                <ToggleGroupItem
                  value="Email"
                  aria-label="Select Email"
                  className="form-toggle-button"
                >
                  Email
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SMS"
                  aria-label="Select SMS"
                  className="form-toggle-button"
                >
                  SMS
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
        />
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="sendReminders"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Send reminder to attendees</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["1 hour before the event"].map((time, index: number) => (
                      <SelectItem key={index.toString()} value={time}>
                        {time}
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
      <Separator />
      <div className="flex justify-end gap-6">
        <Button variant="ghost" className="text-shamiri-new-blue">
          Cancel
        </Button>
        <Button className="bg-shamiri-new-blue">Save Changes</Button>
      </div>
    </Form>
  );
}
