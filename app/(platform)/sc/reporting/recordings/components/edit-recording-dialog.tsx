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
import { toast, toastOnError } from "#/components/ui/use-toast";
import { sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import {
  type FellowGroup,
  type GroupSession,
  loadFellowGroups,
  loadGroupSessions,
  updateSessionRecording,
} from "../actions";
import type { SupervisorFellow } from "../page";
import { type RecordingEditFormData, RecordingEditSchema } from "../schemas";
import type { RecordingTableData } from "./columns";

interface EditRecordingDialogProps {
  recording: RecordingTableData;
  fellows: SupervisorFellow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRecordingDialog({
  recording,
  fellows,
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

  const [loadedGroups, setLoadedGroups] = useState<{
    fellowId: string;
    groups: FellowGroup[];
  } | null>(null);
  const [loadedSessions, setLoadedSessions] = useState<{
    groupId: string;
    sessions: GroupSession[];
  } | null>(null);

  const fellowId = form.watch("fellowId");
  const groupId = form.watch("groupId");
  const groups = loadedGroups?.fellowId === fellowId ? loadedGroups.groups : [];
  const loadingGroups = !!fellowId && loadedGroups?.fellowId !== fellowId;
  const sessions = loadedSessions?.groupId === groupId ? loadedSessions.sessions : [];
  const loadingSessions = !!groupId && loadedSessions?.groupId !== groupId;

  // effect: open is set by the parent; resets the form and loads the recording's groups and sessions when it opens
  useEffect(() => {
    if (!open) return;

    form.reset({
      fellowId: recording.fellowId,
      groupId: recording.groupId,
      sessionId: recording.sessionId,
      originalFileName: recording.originalFileName,
    });

    let cancelled = false;
    const loadRecordingOptions = async () => {
      let fellowGroups: FellowGroup[] = [];
      try {
        fellowGroups = await loadFellowGroups(recording.fellowId);
      } catch {
        if (!cancelled) {
          toast({
            title: "Error",
            description: "Failed to load intervention groups",
            variant: "destructive",
          });
        }
      }
      if (cancelled) return;
      setLoadedGroups({ fellowId: recording.fellowId, groups: fellowGroups });

      let groupSessions: GroupSession[] = [];
      if (fellowGroups.some((g) => g.id === recording.groupId)) {
        try {
          groupSessions = await loadGroupSessions(recording.groupId);
        } catch {
          if (!cancelled) {
            toast({
              title: "Error",
              description: "Failed to load sessions",
              variant: "destructive",
            });
          }
        }
      }
      if (!cancelled) setLoadedSessions({ groupId: recording.groupId, sessions: groupSessions });
    };
    void loadRecordingOptions();
    return () => {
      cancelled = true;
    };
  }, [open, recording, form]);

  function selectFellow(selectedFellowId: string) {
    form.setValue("groupId", "");
    form.setValue("sessionId", "");
    const keepIfStillSelected = (fellowGroups: FellowGroup[]) => {
      if (form.getValues("fellowId") === selectedFellowId) {
        setLoadedGroups({ fellowId: selectedFellowId, groups: fellowGroups });
      }
    };
    loadFellowGroups(selectedFellowId)
      .then(keepIfStillSelected)
      .catch(() => {
        keepIfStillSelected([]);
        toast({
          title: "Error",
          description: "Failed to load intervention groups",
          variant: "destructive",
        });
      });
  }

  function selectGroup(selectedGroupId: string) {
    form.setValue("sessionId", "");
    const keepIfStillSelected = (groupSessions: GroupSession[]) => {
      if (form.getValues("groupId") === selectedGroupId) {
        setLoadedSessions({ groupId: selectedGroupId, sessions: groupSessions });
      }
    };
    loadGroupSessions(selectedGroupId)
      .then(keepIfStillSelected)
      .catch(() => {
        keepIfStillSelected([]);
        toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
      });
  }

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: RecordingEditFormData) => {
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
          <form onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
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
                      onSelectItem={(value) => {
                        if (value === field.value) return;
                        field.onChange(value);
                        selectFellow(value);
                      }}
                      placeholder="Select a fellow"
                      inputPlaceholder="Search fellows..."
                      disabled={isSubmitting}
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      selectGroup(value);
                    }}
                    value={field.value}
                    disabled={!fellowId || loadingGroups || isSubmitting}
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
                    disabled={!groupId || loadingSessions || isSubmitting}
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
                    <Input
                      {...field}
                      disabled={isSubmitting}
                      placeholder="e.g. s2_session_recording"
                    />
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting} loading={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
