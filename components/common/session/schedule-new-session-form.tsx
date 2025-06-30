import RescheduleSession from "#/components/common/session/reschedule-session";
import { ScheduleNewSessionSchema } from "#/components/common/session/schema";
import { SessionDetail } from "#/components/common/session/session-list";
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
import { Separator } from "#/components/ui/separator";
import { ToastAction } from "#/components/ui/toast";
import { useToast } from "#/components/ui/use-toast";
import { createNewSession } from "#/lib/actions/session/session";
import { cn, handleMinutesChange } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ImplementerRole, Prisma } from "@prisma/client";
import { format } from "date-fns";
import { ChevronsUpDown } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { Session } from "./sessions-provider";

export function ScheduleNewSession({
  toggleDialog,
  schools,
  hubSessionTypes,
  role,
}: {
  toggleDialog: Dispatch<SetStateAction<boolean>>;
  schools: Prisma.SchoolGetPayload<{}>[];
  hubSessionTypes: Prisma.SessionNameGetPayload<{}>[];
  role: ImplementerRole;
}) {
  const { toast } = useToast();
  const { refresh } = useContext(SessionsContext);

  const [mode, setMode] = useState<"school" | "venue">("school");

  const [hour, setHour] = useState("9");
  const [minutes, setMinutes] = useState("00");
  const [time, setTime] = useState("AM");
  const [timePicker, setTimePicker] = useState(false);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [existingSession, setExistingSession] = useState<Session>();

  const form = useForm<z.infer<typeof ScheduleNewSessionSchema>>({
    resolver: zodResolver(ScheduleNewSessionSchema),
    defaultValues: {
      sessionId: hubSessionTypes.filter((sessionType) => {
        return sessionType.sessionType !== "INTERVENTION";
      })[0]?.id,
      sessionStartTime: undefined,
      schoolId: "",
      venue: "",
    },
  });

  const sessionIdWatcher = form.watch("sessionId");

  useEffect(() => {
    const sessionType = hubSessionTypes.find((x) => x.id === sessionIdWatcher);
    if (sessionType) {
      form.setValue("sessionType", sessionType.sessionType);
      if (
        sessionType.sessionType !== "INTERVENTION" &&
        sessionType.sessionType !== "CLINICAL" &&
        sessionType.sessionType !== "DATA_COLLECTION"
      ) {
        form.resetField("venue");
        form.resetField("schoolId");
        setMode("venue");
      } else {
        form.resetField("schoolId");
        form.resetField("venue");
        setMode("school");
      }
    }
  }, [hubSessionTypes, sessionIdWatcher]);

  const onSubmit = async (data: z.infer<typeof ScheduleNewSessionSchema>) => {
    const combinedDateTime = new Date(
      `${format(new Date(data.sessionDate), "yyyy-MM-dd")}T${new Date(`1970-01-01 ${data.sessionStartTime}`).toTimeString().slice(0, 5)}:00`,
    );
    data.sessionDate = new Date(combinedDateTime);

    try {
      const response = await createNewSession(data);
      if (response.success) {
        toast({
          variant: "default",
          description: "Successfully created new session",
        });
        form.reset();
        toggleDialog(false);
        await refresh();
      } else {
        if (response.data) {
          setExistingSession(response.data as Session);
          toast({
            variant: "destructive",
            description: response.message,
            action: (
              <ToastAction
                altText="Reschedule"
                onClick={() => {
                  form.reset();
                  toggleDialog(false);
                  setRescheduleDialog(true);
                }}
              >
                Reschedule
              </ToastAction>
            ),
          });
        } else {
          toast({
            variant: "destructive",
            description:
              response.message ??
              "Something went wrong while scheduling a session, please try again",
          });
        }
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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="sessionId"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Select a session type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {hubSessionTypes
                      .filter((sessionType) => {
                        return sessionType.sessionType !== "INTERVENTION";
                      })
                      .map((sessionType) => (
                        <SelectItem key={sessionType.id} value={sessionType.id}>
                          <span className="">
                            {sessionType.sessionType.charAt(0).toUpperCase() +
                              sessionType.sessionType
                                .slice(1)
                                .replace("_", " ")
                                .toLowerCase()}{" "}
                          </span>
                          session - <span>{sessionType.sessionLabel}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "school" && (
            <FormField
              control={form.control}
              name="schoolId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Select school{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
          )}
          {mode === "venue" && (
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>
                    Enter venue{" "}
                    <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Input {...field} type="text" />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                          "mt-1.5 w-full justify-start px-3 text-left font-normal active:scale-100",
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="pt-1" />
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="sessionStartTime"
              render={({ field }) => (
                <div>
                  <FormLabel>Start time</FormLabel>
                  <Popover open={timePicker} onOpenChange={setTimePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "mt-1.5 w-full justify-start px-3 text-left font-normal active:scale-100",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <Icons.clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        {field.value ? field.value : <span>Pick a time</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto px-4 py-3" align="start">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm">Pick a start time</span>
                        <div className="flex items-center gap-2 py-2">
                          <div className="relative w-[4rem]">
                            <Input
                              type="number"
                              onChange={(e) => {
                                setHour(e.target.value);
                              }}
                              value={hour}
                              min={1}
                              max={12}
                              className="transparent-number-arrows"
                            />
                            <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center space-y-0.5 text-muted-foreground">
                              <ChevronsUpDown className="mr-2 h-4 w-4" />
                            </div>
                          </div>
                          <span>:</span>
                          <div className="relative w-[4rem]">
                            <Input
                              type="number"
                              onChange={(e) => {
                                setMinutes(handleMinutesChange(e.target.value));
                              }}
                              value={minutes}
                              min={0}
                              max={59}
                              className="transparent-number-arrows"
                            />
                            <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center space-y-0.5 text-muted-foreground">
                              <ChevronsUpDown className="mr-2 h-4 w-4" />
                            </div>
                          </div>
                          <Select
                            onValueChange={(value) => {
                              setTime(value);
                            }}
                            defaultValue={time}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[4rem]">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="min-w-[4rem]">
                              {["AM", "PM"].map((time) => {
                                return (
                                  <SelectItem key={time} value={time}>
                                    <span>{time}</span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <Separator />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            type="button"
                            size="sm"
                            className="text-sm font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
                            onClick={() => {
                              setTimePicker(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex items-center gap-2 bg-shamiri-new-blue text-sm font-semibold leading-6 text-white"
                            type="submit"
                            size="sm"
                            disabled={form.formState.isSubmitting}
                            loading={form.formState.isSubmitting}
                            onClick={() => {
                              const timeString =
                                hour + ":" + minutes + " " + time;
                              field.onChange(timeString);
                              setTimePicker(false);
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="pt-1" />
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
      {existingSession ? (
        <RescheduleSession
          session={existingSession}
          open={rescheduleDialog}
          onOpenChange={setRescheduleDialog}
          role={role}
        >
          <SessionDetail
            state={{ session: existingSession }}
            layout={"compact"}
            withDropdown={false}
            role={role}
          />
        </RescheduleSession>
      ) : null}
    </>
  );
}
