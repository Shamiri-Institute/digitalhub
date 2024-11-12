import { RescheduleSessionContext } from "#/app/(platform)/hc/context/reschedule-session-dialog-context";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import { rescheduleSession } from "#/app/(platform)/hc/schedule/actions/session";
import { RescheduleSessionSchema } from "#/app/(platform)/hc/schemas";
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
import { toast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useContext } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function RescheduleSession({
  updateSessionsState,
}: {
  updateSessionsState: (sessionDate: Date) => void;
}) {
  const context = useContext(RescheduleSessionContext);

  const form = useForm<z.infer<typeof RescheduleSessionSchema>>({
    resolver: zodResolver(RescheduleSessionSchema),
    defaultValues: {
      sessionStartTime: "06:00",
    },
  });

  const onSubmit = async (data: z.infer<typeof RescheduleSessionSchema>) => {
    const sessionDate =
      format(new Date(data.sessionDate), "yyyy-MM-dd") +
      "T" +
      data.sessionStartTime +
      ":00";
    data.sessionDate = new Date(sessionDate);
    try {
      const response = await rescheduleSession(context.session!.id, data);
      if (response.success) {
        updateSessionsState(data.sessionDate);
        context.setIsOpen(false);
        toast({
          description: response.message,
        });
        form.reset();
        return;
      }
    } catch (error: unknown) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description:
          "Something went wrong while rescheduling session, please try again",
      });
    }
  };

  return (
    <div>
      <Dialog
        open={context.isOpen}
        onOpenChange={context.setIsOpen}
        modal={true}
      >
        <DialogPortal>
          <DialogContent className="flex w-1/3 max-w-none flex-col gap-4">
            <DialogHeader>
              <span className="text-xl font-bold">Reschedule session</span>
            </DialogHeader>
            {context.session && (
              <SessionDetail
                state={{ session: context.session }}
                layout={"compact"}
                withDropdown={false}
              />
            )}
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

                <Separator />

                <div className="flex justify-end gap-6">
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-shamiri-new-blue hover:text-shamiri-blue"
                    onClick={() => {
                      context.setIsOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="brand" loading={form.formState.isSubmitting} disabled={form.formState.isSubmitting}>
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
