import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { RescheduleSessionSchema } from "#/components/common/session/schema";
import { SessionsContext } from "#/components/common/session/sessions-provider";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
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
import { toast } from "#/components/ui/use-toast";
import { rescheduleSession } from "#/lib/actions/session/session";
import { cn, handleMinutesChange } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImplementerRole } from "@prisma/client";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { ChevronsUpDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction, useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Session } from "./sessions-provider";

export default function RescheduleSession({
  session,
  open,
  onOpenChange,
  role,
  children,
}: {
  session: Session;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  children: React.ReactNode;
}) {
  const { refresh } = useContext(SessionsContext);
  const pathname = usePathname();

  const [hour, setHour] = useState(format(session.sessionDate, "h"));
  const [minutes, setMinutes] = useState(format(session.sessionDate, "mm"));
  const [time, setTime] = useState(format(session.sessionDate, "aa"));
  const [timePicker, setTimePicker] = useState(false);

  const form = useForm<z.infer<typeof RescheduleSessionSchema>>({
    resolver: zodResolver(RescheduleSessionSchema),
    defaultValues: {
      sessionDate: session.sessionDate,
      sessionStartTime: format(session.sessionDate, "h:mm aa"),
    },
  });

  const onSubmit = async (data: z.infer<typeof RescheduleSessionSchema>) => {
    const combinedDateTime = new Date(
      `${format(new Date(data.sessionDate), "yyyy-MM-dd")}T${new Date(`1970-01-01 ${data.sessionStartTime}`).toTimeString().slice(0, 5)}:00`,
    );
    data.sessionDate = new Date(combinedDateTime);

    const response = await rescheduleSession(session.id, data);
    if (!response.success) {
      onOpenChange(false);
      toast({
        variant: "destructive",
        description:
          response.message ??
          "Something went wrong while trying to reschedule the session.",
      });
      return;
    }

    await Promise.all([
      await revalidatePageAction(pathname),
      await refresh(),
    ]).then(() => {
      toast({
        description: response.message,
      });
      onOpenChange(false);
    });
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogContent className="flex w-1/3 max-w-none flex-col gap-4">
            <DialogHeader>
              <span className="text-xl font-bold">Reschedule session</span>
            </DialogHeader>
            {children}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                              {field.value ? (
                                field.value
                              ) : (
                                <span>Pick a time</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto px-4 py-3"
                            align="start"
                          >
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

                <Separator />

                <div className="flex justify-end gap-6">
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-shamiri-new-blue hover:text-shamiri-blue"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    loading={form.formState.isSubmitting}
                    disabled={form.formState.isSubmitting}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
