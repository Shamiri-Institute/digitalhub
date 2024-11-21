import { createNewSession } from "#/app/(platform)/hc/schedule/actions/session";
import { ScheduleNewSessionSchema } from "#/components/common/session/schema";
import { SessionsContext } from "#/components/common/session/sessions-provider";
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
import { useToast } from "#/components/ui/use-toast";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Prisma } from "@prisma/client";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { Dispatch, SetStateAction, useContext } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function ScheduleNewSession({
  toggleDialog,
  schools,
  hubId,
}: {
  toggleDialog: Dispatch<SetStateAction<boolean>>;
  schools: Prisma.SchoolGetPayload<{}>[];
  hubId: string;
}) {
  const { toast } = useToast();
  const { setSessions } = useContext(SessionsContext);

  const form = useForm<z.infer<typeof ScheduleNewSessionSchema>>({
    resolver: zodResolver(ScheduleNewSessionSchema),
    defaultValues: {
      sessionType: "s0",
      sessionStartTime: "06:00",
    },
  });

  const onSubmit = async (data: z.infer<typeof ScheduleNewSessionSchema>) => {
    const sessionDate =
      format(new Date(data.sessionDate), "yyyy-MM-dd") +
      "T" +
      data.sessionStartTime +
      ":00";
    data.sessionDate = new Date(sessionDate);
    data.projectId = CURRENT_PROJECT_ID;

    try {
      const response = await createNewSession(data);
      if (response.success) {
        const fetchedSessions = await fetchInterventionSessions({
          hubId,
        });
        setSessions(fetchedSessions);

        toast({
          variant: "default",
          description: `Successfully created new session`,
        });
        form.reset();
        toggleDialog(false);
      } else {
        toast({
          variant: "destructive",
          description:
            response.message ??
            "Something went wrong while scheduling a session, please try again",
        });
      }
      return;
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description:
          "Something went wrong while scheduling a session, please try again",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <SelectContent className="max-h-[200px]">
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
          name="schoolId"
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
                <SelectContent className="max-h-[200px]">
                  {schools.map((school) => (
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

        <div className="grid grid-cols-2 gap-4">
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
                  onChange={field.onChange}
                  min="06:00"
                  max="18:00"
                  defaultValue="06:00"
                  className="mt-1.5 w-full appearance-none"
                />
              </div>
            )}
          />
        </div>

        {/*<div className="grid grid-cols-3 gap-4">*/}
        {/*  <FormField*/}
        {/*    control={form.control}*/}
        {/*    name="notifications"*/}
        {/*    render={({ field }) => (*/}
        {/*      <div>*/}
        {/*        <FormLabel>Notification</FormLabel>*/}
        {/*        <ToggleGroup*/}
        {/*          type="single"*/}
        {/*          value={field.value}*/}
        {/*          onValueChange={field.onChange}*/}
        {/*          className="form-toggle"*/}
        {/*        >*/}
        {/*          <ToggleGroupItem*/}
        {/*            value="Email"*/}
        {/*            aria-label="Select Email"*/}
        {/*            className="form-toggle-button"*/}
        {/*          >*/}
        {/*            Email*/}
        {/*          </ToggleGroupItem>*/}
        {/*          <ToggleGroupItem*/}
        {/*            value="SMS"*/}
        {/*            aria-label="Select SMS"*/}
        {/*            className="form-toggle-button"*/}
        {/*          >*/}
        {/*            SMS*/}
        {/*          </ToggleGroupItem>*/}
        {/*        </ToggleGroup>*/}
        {/*      </div>*/}
        {/*    )}*/}
        {/*  />*/}
        {/*  <div className="col-span-2">*/}
        {/*    <FormField*/}
        {/*      control={form.control}*/}
        {/*      name="sendReminders"*/}
        {/*      render={({ field }) => (*/}
        {/*        <FormItem className="space-y-2">*/}
        {/*          <FormLabel>Send reminder to attendees</FormLabel>*/}
        {/*          <Select*/}
        {/*            onValueChange={field.onChange}*/}
        {/*            defaultValue={field.value}*/}
        {/*          >*/}
        {/*            <FormControl>*/}
        {/*              <SelectTrigger>*/}
        {/*                <SelectValue />*/}
        {/*              </SelectTrigger>*/}
        {/*            </FormControl>*/}
        {/*            <SelectContent>*/}
        {/*              {["1 hour before the event"].map(*/}
        {/*                (time, index: number) => (*/}
        {/*                  <SelectItem key={index.toString()} value={time}>*/}
        {/*                    {time}*/}
        {/*                  </SelectItem>*/}
        {/*                ),*/}
        {/*              )}*/}
        {/*            </SelectContent>*/}
        {/*          </Select>*/}
        {/*          <FormMessage />*/}
        {/*        </FormItem>*/}
        {/*      )}*/}
        {/*    />*/}
        {/*  </div>*/}
        {/*</div>*/}

        <Separator />

        <div className="flex justify-end gap-6">
          <Button
            variant="ghost"
            type="button"
            className="text-shamiri-new-blue hover:text-shamiri-blue"
            onClick={() => toggleDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            loading={form.formState.isSubmitting}
            disabled={form.formState.isSubmitting}
          >
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
