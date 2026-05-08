"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { type TriageEventFormData, TriageEventSchema } from "#/app/(platform)/hc/schemas";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import type { TriageEventWithRelations } from "#/lib/actions/triage";
import {
  createTriageEvent,
  getSupervisorsInFellowHub,
  updateTriageEvent,
} from "#/lib/actions/triage";
import { zodResolver } from "#/lib/zod-resolver";

const RISK_SCREEN_OPTIONS: { value: TriageEventFormData["riskScreenOutcome"]; label: string }[] = [
  { value: "ALL_NO", label: "All NO (Risk negative)" },
  { value: "ANY_YES", label: "Any YES (Risk positive)" },
  { value: "NOT_COMPLETED", label: "Not completed (requires reason)" },
];

const ACTION_OPTIONS: { value: TriageEventFormData["actionTaken"]; label: string }[] = [
  { value: "SUPPORTED", label: "Provided peer counselling" },
  { value: "REFERRED", label: "Referred to supervisor (risk-negative)" },
  { value: "ESCALATED", label: "Escalated immediately to supervisor (risk-positive)" },
  { value: "REFUSED", label: "Student refused supervisor referral" },
  { value: "INTERRUPTED", label: "Student interaction ended abruptly" },
];

const HANDOFF_OPTIONS: {
  value: NonNullable<TriageEventFormData["supervisorHandoffStatus"]>;
  label: string;
}[] = [
  { value: "WARM_HANDOFF", label: "Warm handoff completed (same day)" },
  { value: "SUPERVISOR_NOTIFIED", label: "Supervisor notified (pending contact)" },
  { value: "COULD_NOT_REACH", label: "Could not reach supervisor (fallback used)" },
  { value: "STUDENT_REFUSED_NOTIFIED", label: "Student refused (supervisor still notified)" },
];

const RISK_NOT_COMPLETED_OPTIONS: {
  value: NonNullable<TriageEventFormData["riskNotCompletedReason"]>;
  label: string;
}[] = [
  { value: "STUDENT_LEFT", label: "Student left / not available" },
  { value: "NO_PRIVACY", label: "No privacy / interruptions" },
  { value: "TIME_CONSTRAINTS", label: "Time constraints" },
  { value: "OTHER", label: "Other" },
];

export default function TriageEventModal({
  isOpen,
  setIsOpen,
  studentId,
  studentName,
  sessionId,
  sessionName,
  hubId,
  existingEvent,
  readOnly = false,
  onSuccess,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  studentId: string;
  studentName?: string | null;
  sessionId: string;
  sessionName?: string;
  hubId?: string | null;
  existingEvent?: TriageEventWithRelations | null;
  readOnly?: boolean;
  onSuccess?: () => void;
}) {
  const [supervisorsInHub, setSupervisorsInHub] = useState<
    { id: string; supervisorName: string | null }[]
  >([]);

  const form = useForm<TriageEventFormData>({
    resolver: zodResolver(TriageEventSchema),
    defaultValues: {
      studentId,
      sessionId,
      riskScreenOutcome: undefined,
      riskNotCompletedReason: undefined,
      actionTaken: undefined,
      referredSupervisorId: undefined,
      supervisorHandoffStatus: undefined,
      note: undefined,
    },
  });

  const riskScreenOutcome = form.watch("riskScreenOutcome");
  const actionTaken = form.watch("actionTaken");

  const showNotCompletedReason = riskScreenOutcome === "NOT_COMPLETED";
  const showHandoff =
    actionTaken === "REFERRED" || actionTaken === "ESCALATED" || actionTaken === "REFUSED";
  const showSupervisorSelect = actionTaken === "REFERRED" || actionTaken === "ESCALATED";
  const forceEscalated = riskScreenOutcome === "ANY_YES";

  const loadSupervisors = useCallback(async () => {
    try {
      const supervisors = hubId
        ? await getSupervisorsInFellowHub(hubId, { useAsHubId: true })
        : await getSupervisorsInFellowHub(sessionId);
      setSupervisorsInHub(supervisors);
    } catch {
      setSupervisorsInHub([]);
    }
  }, [sessionId, hubId]);

  useEffect(() => {
    if (isOpen) {
      void loadSupervisors();
    }
  }, [isOpen, loadSupervisors]);

  useEffect(() => {
    if (forceEscalated) {
      form.setValue("actionTaken", "ESCALATED");
    }
  }, [forceEscalated, form]);

  useEffect(() => {
    if (!isOpen) return;
    if (existingEvent) {
      form.reset({
        id: existingEvent.id,
        studentId: existingEvent.studentId,
        sessionId: existingEvent.sessionId,
        riskScreenOutcome: existingEvent.riskScreenOutcome ?? undefined,
        riskNotCompletedReason: existingEvent.riskNotCompletedReason ?? undefined,
        actionTaken: existingEvent.actionTaken ?? undefined,
        referredSupervisorId: existingEvent.referredSupervisorId ?? undefined,
        supervisorHandoffStatus: existingEvent.supervisorHandoffStatus ?? undefined,
        note: existingEvent.note ?? undefined,
      });
    } else {
      form.reset({
        studentId,
        sessionId,
        riskScreenOutcome: undefined,
        riskNotCompletedReason: undefined,
        actionTaken: undefined,
        referredSupervisorId: undefined,
        supervisorHandoffStatus: undefined,
        note: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when modal/session/student/event identity changes
  }, [isOpen, existingEvent, studentId, sessionId]);

  const onSubmit = async (data: z.infer<typeof TriageEventSchema>) => {
    const result = existingEvent
      ? await updateTriageEvent(
          { ...data, id: existingEvent.id },
          existingEvent.studentAttendanceId ?? undefined,
        )
      : await createTriageEvent(data);

    if (!result.success) {
      toast({
        variant: "destructive",
        description: result.message,
      });
      return;
    }
    toast({ description: result.message });
    setIsOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="lg:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {readOnly ? "View triage" : "Document triage"}
          </DialogTitle>
          <p className="text-sm text-shamiri-text-grey">
            {studentName ? (
              <span className="capitalize">{studentName.toLowerCase()}</span>
            ) : (
              "Student"
            )}{" "}
            {sessionName && (
              <>
                <span className="mx-1">·</span>
                {sessionName}
              </>
            )}
          </p>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={readOnly ? (e) => e.preventDefault() : form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="riskScreenOutcome"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">Risk screen outcome (required)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={readOnly}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RISK_SCREEN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showNotCompletedReason && (
              <FormField
                control={form.control}
                name="riskNotCompletedReason"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">
                      Reason risk screen not completed (required)
                    </FormLabel>
                    <p className="text-xs text-shamiri-text-grey">
                      Shown when Risk screen outcome is Not completed.
                    </p>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_NOT_COMPLETED_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="actionTaken"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">Action taken (required)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={readOnly}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {forceEscalated && (
                    <p className="text-xs text-shamiri-text-grey">
                      Risk positive requires escalation to supervisor.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {showSupervisorSelect && (
              <FormField
                control={form.control}
                name="referredSupervisorId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Supervisor (in your hub)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisorsInHub.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.supervisorName ?? sup.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showHandoff && (
              <FormField
                control={form.control}
                name="supervisorHandoffStatus"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Supervisor handoff status (required)</FormLabel>
                    <p className="text-xs text-shamiri-text-grey">
                      Shown when Action taken is Referred, Escalated, or Student refused.
                    </p>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HANDOFF_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">
                    Short note (optional, max 200 characters)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add context if needed"
                      className="resize-none"
                      maxLength={200}
                      rows={2}
                      disabled={readOnly}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-shamiri-text-grey">{field.value?.length ?? 0}/200</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-2 pt-2">
              {readOnly ? (
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-shamiri-new-blue hover:bg-blue-bg"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving…" : "Save triage"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
