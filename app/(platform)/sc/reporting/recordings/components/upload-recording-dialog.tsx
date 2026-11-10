"use client";

import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Combobox } from "#/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialogSave,
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
import { Separator } from "#/components/ui/separator";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { cn, formatBytes, sessionDisplayName } from "#/lib/utils";
import { zodResolver } from "#/lib/zod-resolver";
import {
  checkRecordingExists,
  createSessionRecording,
  type FellowGroup,
  type GroupSession,
  loadFellowGroups,
  loadGroupSessions,
} from "../actions";
import type { SupervisorFellow } from "../page";
import {
  ALLOWED_EXTENSIONS,
  type RecordingUploadFormData,
  RecordingUploadSchema,
  validateAudioFile,
  validateAudioMagicBytes,
} from "../schemas";

type AudioFileState =
  | { status: "empty" }
  | { status: "validating"; file: File }
  | { status: "invalid"; error: string }
  | { status: "ready"; file: File };

async function validateAudio(file: File): Promise<AudioFileState> {
  try {
    const basicValidation = validateAudioFile(file);
    if (!basicValidation.valid) {
      return { status: "invalid", error: basicValidation.error ?? "Invalid file" };
    }
    const magicValidation = await validateAudioMagicBytes(file);
    if (!magicValidation.valid) {
      return { status: "invalid", error: magicValidation.error ?? "Invalid file content" };
    }
    return { status: "ready", file };
  } catch (error) {
    console.error("Error validating file:", error);
    return { status: "invalid", error: "Failed to validate file" };
  }
}

interface UploadRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fellows: SupervisorFellow[];
}

export default function UploadRecordingDialog({
  open,
  onOpenChange,
  fellows,
}: UploadRecordingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <UploadRecordingForm fellows={fellows} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UploadRecordingForm({
  fellows,
  close,
}: {
  fellows: SupervisorFellow[];
  close: () => void;
}) {
  const { isSaving: isUploading, save } = useDialogSave();
  const form = useForm<RecordingUploadFormData>({
    resolver: zodResolver(RecordingUploadSchema),
    defaultValues: {
      fellowId: "",
      groupId: "",
      sessionId: "",
      schoolId: "",
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
  const [duplicateCheck, setDuplicateCheck] = useState<{ key: string; exists: boolean } | null>(
    null,
  );

  const [audioFile, setAudioFile] = useState<AudioFileState>({ status: "empty" });
  const { uploadToS3, files: s3Uploads } = useS3Upload();
  const fileInputDisabled = isUploading || audioFile.status === "validating";

  const readyFile = audioFile.status === "ready" ? audioFile.file : null;
  const readyFileUpload = s3Uploads.findLast((upload) => upload.file === readyFile);
  const uploadProgress =
    isUploading && readyFileUpload ? Math.min(Math.round(readyFileUpload.progress * 0.8), 80) : 0;

  const fellowId = form.watch("fellowId");
  const groupId = form.watch("groupId");
  const sessionId = form.watch("sessionId");

  const duplicateKey = `${fellowId}:${groupId}:${sessionId}`;
  const groups = loadedGroups?.fellowId === fellowId ? loadedGroups.groups : [];
  const loadingGroups = !!fellowId && loadedGroups?.fellowId !== fellowId;
  const sessions = loadedSessions?.groupId === groupId ? loadedSessions.sessions : [];
  const loadingSessions = !!groupId && loadedSessions?.groupId !== groupId;
  const checkingDuplicate = !!sessionId && duplicateCheck?.key !== duplicateKey;
  const duplicateExists = duplicateCheck?.key === duplicateKey && duplicateCheck.exists;

  const clearFile = () => {
    setAudioFile({ status: "empty" });
  };

  function selectFellow(selectedFellowId: string) {
    form.setValue("groupId", "");
    form.setValue("sessionId", "");
    form.setValue("schoolId", "");
    clearFile();
    const keepIfStillSelected = (fellowGroups: FellowGroup[]) => {
      if (form.getValues("fellowId") === selectedFellowId) {
        setLoadedGroups({ fellowId: selectedFellowId, groups: fellowGroups });
      }
    };
    loadFellowGroups(selectedFellowId)
      .then(keepIfStillSelected)
      .catch((error) => {
        console.error("Error loading groups:", error);
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
    form.setValue("schoolId", groups.find((g) => g.id === selectedGroupId)?.schoolId ?? "");
    clearFile();
    const keepIfStillSelected = (groupSessions: GroupSession[]) => {
      if (form.getValues("groupId") === selectedGroupId) {
        setLoadedSessions({ groupId: selectedGroupId, sessions: groupSessions });
      }
    };
    loadGroupSessions(selectedGroupId)
      .then(keepIfStillSelected)
      .catch((error) => {
        console.error("Error loading sessions:", error);
        keepIfStillSelected([]);
        toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
      });
  }

  function selectSession(selectedSessionId: string) {
    const values = form.getValues();
    const key = `${values.fellowId}:${values.groupId}:${selectedSessionId}`;
    const isStillSelected = () => {
      const current = form.getValues();
      return `${current.fellowId}:${current.groupId}:${current.sessionId}` === key;
    };
    checkRecordingExists({
      fellowId: values.fellowId,
      groupId: values.groupId,
      sessionId: selectedSessionId,
      schoolId: values.schoolId,
    })
      .then((existing) => {
        if (!isStillSelected()) return;
        setDuplicateCheck({ key, exists: !!existing });
        if (existing) {
          toast({
            title: "Recording exists",
            description:
              "A recording already exists for this session. Please choose a different session.",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error("Error checking duplicate:", error);
        if (!isStillSelected()) return;
        setDuplicateCheck({ key, exists: false });
        toast({
          title: "Error",
          description: "Could not check for an existing recording",
          variant: "destructive",
        });
      });
  }

  const handleFileSelect = async (file: File) => {
    setAudioFile({ status: "validating", file });
    const validated = await validateAudio(file);
    // A reset (new fellow or group, closing the dialog) can replace the file while it validates.
    setAudioFile((current) =>
      current.status === "validating" && current.file === file ? validated : current,
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (fileInputDisabled) return;

    let files: File[] = [];
    if (e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    if (files.length > 0 && files[0]) {
      void handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  const onSubmit = (data: RecordingUploadFormData) => {
    if (audioFile.status !== "ready") {
      setAudioFile({ status: "invalid", error: "Please select a file" });
      return;
    }
    const { file } = audioFile;

    if (duplicateExists) {
      toast({
        title: "Cannot upload",
        description: "A recording already exists for this session",
        variant: "destructive",
      });
      return;
    }

    save(async () => {
      try {
        const { key, token } = await uploadToS3(file, {
          bucket: "recordings",
          groupId: data.groupId,
          sessionId: data.sessionId,
        });

        if (!key || !token) {
          throw new Error("Upload failed - no key returned");
        }

        const result = await createSessionRecording({
          fellowId: data.fellowId,
          schoolId: data.schoolId,
          groupId: data.groupId,
          sessionId: data.sessionId,
          originalFileName: file.name,
          s3Key: key,
          token,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Recording uploaded successfully",
          });
          close();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Failed to upload recording",
          variant: "destructive",
        });
      }
    });
  };

  const canUploadFile = fellowId && groupId && sessionId && !duplicateExists && !checkingDuplicate;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload recording</DialogTitle>
        <DialogDescription>Enter session details and upload the audio file.</DialogDescription>
        <Separator />
      </DialogHeader>

      <Form {...form}>
        <form noValidate onSubmit={toastOnError(form.handleSubmit(onSubmit))} className="space-y-4">
          <FormField
            control={form.control}
            name="fellowId"
            render={({ field }) => (
              <FormItem required>
                <FormLabel>Fellow</FormLabel>
                <FormControl>
                  <Combobox
                    items={fellows.map((fellow) => ({
                      id: fellow.id,
                      label: fellow.fellowName ?? "Unknown",
                    }))}
                    activeItemId={field.value}
                    onSelectItem={(value) => {
                      if (value === field.value) return;
                      field.onChange(value);
                      selectFellow(value);
                    }}
                    placeholder="Select a fellow"
                    inputPlaceholder="Search fellows..."
                    disabled={isUploading}
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
              <FormItem required>
                <FormLabel>Group</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    selectGroup(value);
                  }}
                  value={field.value}
                  disabled={!fellowId || loadingGroups || isUploading}
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
              <FormItem required>
                <FormLabel>Session</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    selectSession(value);
                  }}
                  value={field.value}
                  disabled={!groupId || loadingSessions || isUploading}
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

          <input type="hidden" {...form.register("schoolId")} />

          {duplicateExists && (
            <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <Icons.alertCircle className="h-4 w-4" />
                <span>A recording already exists for this session</span>
              </div>
            </div>
          )}

          {canUploadFile && (
            <>
              <Separator />
              <div className="space-y-2">
                <FormLabel required>Audio File</FormLabel>
                {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag-and-drop target; the wrapped file input stays keyboard accessible */}
                <label
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                    fileInputDisabled
                      ? "cursor-not-allowed border-border bg-muted"
                      : "border-input hover:border-primary",
                    audioFile.status === "invalid" && "border-destructive-border",
                  )}
                >
                  {audioFile.status === "ready" ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Icons.check className="h-4 w-4 text-success" />
                      <span>{audioFile.file.name}</span>
                      <span className="text-muted-foreground">
                        ({formatBytes(audioFile.file.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Icons.uploadCloudIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium text-primary">Click to upload</span>
                        {" or drag and drop"}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ALLOWED_EXTENSIONS.join(", ")} (max 500MB)
                      </span>
                    </div>
                  )}
                  <input
                    aria-label="Audio file"
                    type="file"
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    onChange={handleFileInputChange}
                    disabled={fileInputDisabled}
                    className="hidden"
                  />
                </label>
                {audioFile.status === "invalid" && (
                  <p className="text-sm text-destructive">{audioFile.error}</p>
                )}
                {audioFile.status === "validating" && (
                  <p className="text-sm text-muted-foreground">Validating file...</p>
                )}
              </div>
            </>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={audioFile.status !== "ready" || isUploading || duplicateExists}
              loading={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
