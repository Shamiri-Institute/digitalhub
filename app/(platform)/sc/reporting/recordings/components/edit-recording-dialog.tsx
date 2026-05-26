"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "#/components/ui/button";
import { Combobox } from "#/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import {
  type FellowGroup,
  type GroupSession,
  loadFellowGroups,
  loadGroupSessions,
  loadSupervisorFellows,
  type SupervisorFellow,
  updateSessionRecording,
} from "../actions";
import { type RecordingEditFormData, RecordingEditSchema } from "../schemas";
import type { RecordingTableData } from "./columns";

interface EditRecordingDialogProps {
  recording: RecordingTableData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRecordingDialog({
  recording,
  open,
  onOpenChange,
}: EditRecordingDialogProps) {
  const form = useForm<RecordingEditFormData>({
    resolver: zodResolver(RecordingEditSchema),
    defaultValues: {
      fellowId: recording.fellowId,
      groupId: recording.groupId,
      sessionId: recording.sessionId,
      originalFileName: recording.originalFileName,
    },
  });

  const [fellows, setFellows] = useState<SupervisorFellow[]>([]);
  const [groups, setGroups] = useState<FellowGroup[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);

  const [loadingFellows, setLoadingFellows] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);

  const fellowId = form.watch("fellowId");
  const groupId = form.watch("groupId");

  useEffect(() => {
    if (!open) return;

    form.reset({
      fellowId: recording.fellowId,
      groupId: recording.groupId,
      sessionId: recording.sessionId,
      originalFileName: recording.originalFileName,
    });

    setLoadingFellows(true);
    loadSupervisorFellows()
      .then(setFellows)
      .catch(() =>
        toast({ title: "Error", description: "Failed to load fellows", variant: "destructive" }),
      )
      .finally(() => setLoadingFellows(false));
  }, [open, recording, form]);

  // When fellowId changes, reload groups.
  // On initial load (fellowId matches the recording's original value), also
  // pre-load the sessions for the original group so all fields are pre-selected.
  useEffect(() => {
    if (!fellowId) return;

    const isInitialValue = fellowId === recording.fellowId;

    setLoadingGroups(true);
    setGroups([]);

    if (!isInitialValue) {
      setSessions([]);
      form.setValue("groupId", "");
      form.setValue("sessionId", "");
    }

    loadFellowGroups(fellowId)
      .then((loadedGroups) => {
        setGroups(loadedGroups);
        if (isInitialValue) {
          const originalGroup = loadedGroups.find((g) => g.id === recording.groupId);
          if (originalGroup) {
            setLoadingSessions(true);
            loadGroupSessions(recording.groupId)
              .then(setSessions)
              .catch(() =>
                toast({
                  title: "Error",
                  description: "Failed to load sessions",
                  variant: "destructive",
                }),
              )
              .finally(() => setLoadingSessions(false));
          }
        }
      })
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load intervention groups",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingGroups(false));
  }, [fellowId, recording.fellowId, recording.groupId, form.setValue]);

  useEffect(() => {
    if (!groupId || groupId === recording.groupId) return;

    setLoadingSessions(true);
    setSessions([]);
    form.setValue("sessionId", "");

    loadGroupSessions(groupId)
      .then(setSessions)
      .catch(() =>
        toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" }),
      )
      .finally(() => setLoadingSessions(false));
  }, [groupId, recording.groupId, form.setValue]);

  const onSubmit = async (data: RecordingEditFormData) => {
    setSaving(true);
    try {
      const result = await updateSessionRecording({
        recordingId: recording.id,
        fellowId: data.fellowId,
        groupId: data.groupId,
        sessionId: data.sessionId,
        originalFileName: data.originalFileName,
      });

      if (result.success) {
        toast({ title: "Success", description: result.message });
        onOpenChange(false);
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update recording", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit recording</DialogTitle>
          <DialogDescription>Update the details for this recording.</DialogDescription>
          <Separator />
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fellowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fellow <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      items={fellows.map((f) => ({
                        id: f.id,
                        label: f.fellowName ?? "Unknown",
                      }))}
                      activeItemId={field.value}
                      onSelectItem={field.onChange}
                      placeholder={loadingFellows ? "Loading..." : "Select a fellow"}
                      inputPlaceholder="Search fellows..."
                      disabled={loadingFellows || saving}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Group <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!fellowId || loadingGroups || saving}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !fellowId
                              ? "Select fellow first"
                              : loadingGroups
                                ? "Loading..."
                                : "Select group"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.groupName} ({group.school.schoolName})
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
              name="sessionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Session <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!groupId || loadingSessions || saving}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !groupId
                              ? "Select group first"
                              : loadingSessions
                                ? "Loading..."
                                : "Select a session"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {sessionDisplayName(session.sessionName ?? undefined)} -{" "}
                          {format(new Date(session.sessionDate), "dd MMM yyyy")}
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
              name="originalFileName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Recording name <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={saving} placeholder="e.g. s2_session_recording" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={saving} loading={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
