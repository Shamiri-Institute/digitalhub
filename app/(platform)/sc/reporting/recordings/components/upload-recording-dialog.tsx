"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Icons } from "#/components/icons";
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
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { objectId } from "#/lib/crypto";
import { useS3Upload } from "#/lib/hooks/use-s3-upload";
import { cn, formatBytes } from "#/lib/utils";
import { buildS3Key, generateRecordingFilename } from "#/lib/utils/s3-key-builder";
import {
  checkRecordingExists,
  createSessionRecording,
  type FellowGroup,
  type GroupSession,
  loadFellowGroups,
  loadGroupSessions,
  loadSupervisorFellows,
  type SupervisorFellow,
} from "../actions";
import {
  ALLOWED_EXTENSIONS,
  getFileExtension,
  type RecordingUploadFormData,
  RecordingUploadSchema,
  validateAudioFile,
  validateAudioMagicBytes,
} from "../schemas";

interface UploadRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadRecordingDialog({ open, onOpenChange }: UploadRecordingDialogProps) {
  // Form state
  const form = useForm<RecordingUploadFormData>({
    resolver: zodResolver(RecordingUploadSchema),
    defaultValues: {
      fellowId: "",
      groupId: "",
      sessionId: "",
      schoolId: "",
    },
  });

  // Dropdown data state
  const [fellows, setFellows] = useState<SupervisorFellow[]>([]);
  const [groups, setGroups] = useState<FellowGroup[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);

  // Loading states
  const [loadingFellows, setLoadingFellows] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Duplicate check state
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validatingFile, setValidatingFile] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadToS3, files } = useS3Upload();

  // Track real upload progress from the hook
  useEffect(() => {
    if (files.length > 0 && uploading) {
      const lastFile = files[files.length - 1];
      if (lastFile) {
        // Cap at 80% during upload, reserve 20% for DB record creation
        setUploadProgress(Math.min(Math.round(lastFile.progress * 0.8), 80));
      }
    }
  }, [files, uploading]);

  // Watch form values for cascading selects
  const fellowId = form.watch("fellowId");
  const groupId = form.watch("groupId");
  const sessionId = form.watch("sessionId");
  const schoolId = form.watch("schoolId");

  // Load fellows on mount
  useEffect(() => {
    if (open) {
      setLoadingFellows(true);
      loadSupervisorFellows()
        .then(setFellows)
        .catch((error) => {
          console.error("Error loading fellows:", error);
          toast({
            title: "Error",
            description: "Failed to load fellows",
            variant: "destructive",
          });
        })
        .finally(() => setLoadingFellows(false));
    }
  }, [open]);

  // Load groups when fellow changes
  useEffect(() => {
    if (fellowId) {
      setLoadingGroups(true);
      setGroups([]);
      setSessions([]);
      form.setValue("groupId", "");
      form.setValue("sessionId", "");
      form.setValue("schoolId", "");
      setDuplicateExists(false);
      setSelectedFile(null);
      setFileError(null);

      loadFellowGroups(fellowId)
        .then(setGroups)
        .catch((error) => {
          console.error("Error loading groups:", error);
          toast({
            title: "Error",
            description: "Failed to load intervention groups",
            variant: "destructive",
          });
        })
        .finally(() => setLoadingGroups(false));
    }
  }, [fellowId, form]);

  // Load sessions when group changes
  useEffect(() => {
    if (groupId) {
      setLoadingSessions(true);
      setSessions([]);
      form.setValue("sessionId", "");
      setDuplicateExists(false);
      setSelectedFile(null);
      setFileError(null);

      // Set school ID from selected group
      const selectedGroup = groups.find((g) => g.id === groupId);
      if (selectedGroup) {
        form.setValue("schoolId", selectedGroup.schoolId);
      }

      loadGroupSessions(groupId)
        .then(setSessions)
        .catch((error) => {
          console.error("Error loading sessions:", error);
          toast({
            title: "Error",
            description: "Failed to load sessions",
            variant: "destructive",
          });
        })
        .finally(() => setLoadingSessions(false));
    }
  }, [groupId, groups, form]);

  // Check for duplicate when session is selected
  useEffect(() => {
    if (fellowId && groupId && sessionId && schoolId) {
      setCheckingDuplicate(true);
      setDuplicateExists(false);

      checkRecordingExists({ fellowId, groupId, sessionId, schoolId })
        .then((existing) => {
          if (existing) {
            setDuplicateExists(true);
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
        })
        .finally(() => setCheckingDuplicate(false));
    }
  }, [fellowId, groupId, sessionId, schoolId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setFileError(null);
    setValidatingFile(true);

    try {
      // Basic validation (type and size)
      const basicValidation = validateAudioFile(file);
      if (!basicValidation.valid) {
        setFileError(basicValidation.error ?? "Invalid file");
        setSelectedFile(null);
        return;
      }

      // Magic bytes validation
      const magicValidation = await validateAudioMagicBytes(file);
      if (!magicValidation.valid) {
        setFileError(magicValidation.error ?? "Invalid file content");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    } catch (error) {
      console.error("Error validating file:", error);
      setFileError("Failed to validate file");
      setSelectedFile(null);
    } finally {
      setValidatingFile(false);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();

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
    },
    [handleFileSelect],
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  // Handle form submission
  const onSubmit = async (data: RecordingUploadFormData) => {
    if (!selectedFile) {
      setFileError("Please select a file");
      return;
    }

    if (duplicateExists) {
      toast({
        title: "Cannot upload",
        description: "A recording already exists for this session",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get context data for S3 key
      const selectedGroup = groups.find((g) => g.id === data.groupId);
      const selectedSession = sessions.find((s) => s.id === data.sessionId);
      const selectedFellow = fellows.find((f) => f.id === data.fellowId);

      if (!selectedGroup || !selectedSession || !selectedFellow) {
        throw new Error("Missing selection data");
      }

      // Generate recording ID and filename
      const recordingId = objectId("rec");
      const extension = getFileExtension(selectedFile.name);
      const fileName = generateRecordingFilename(
        selectedSession.sessionType ?? "session",
        recordingId,
        extension,
      );

      // Build S3 key
      const s3Key = buildS3Key({
        schoolName: selectedGroup.school.schoolName,
        fellowName: selectedFellow.fellowName ?? "unknown",
        groupName: selectedGroup.groupName,
        sessionType: selectedSession.sessionType ?? "session",
        recordingId,
        extension,
      });

      // Upload to S3 (dedicated recordings bucket)
      const { key } = await uploadToS3(selectedFile, {
        endpoint: {
          request: {
            body: {
              key: s3Key,
              bucket: "recordings",
            },
          },
        },
      });

      if (!key) {
        throw new Error("Upload failed - no key returned");
      }

      // Create database record
      const result = await createSessionRecording({
        fellowId: data.fellowId,
        schoolId: data.schoolId,
        groupId: data.groupId,
        sessionId: data.sessionId,
        fileName,
        originalFileName: selectedFile.name,
        s3Key: key,
        contentType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      setUploadProgress(100);

      if (result.success) {
        toast({
          title: "Success",
          description: "Recording uploaded successfully",
        });
        handleClose();
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
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    form.reset();
    setFellows([]);
    setGroups([]);
    setSessions([]);
    setSelectedFile(null);
    setFileError(null);
    setDuplicateExists(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  // Check if file upload is allowed
  const canUploadFile = fellowId && groupId && sessionId && !duplicateExists && !checkingDuplicate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Recording</DialogTitle>
        </DialogHeader>
        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fellow Select */}
            <FormField
              control={form.control}
              name="fellowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fellow <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingFellows || uploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingFellows ? "Loading..." : "Select fellow"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fellows.map((fellow) => (
                        <SelectItem key={fellow.id} value={fellow.id}>
                          {fellow.fellowName ?? "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Select */}
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Intervention Group <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!fellowId || loadingGroups || uploading}
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

            {/* Session Select */}
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
                    disabled={!groupId || loadingSessions || uploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !groupId
                              ? "Select group first"
                              : loadingSessions
                                ? "Loading..."
                                : "Select session"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.sessionName ?? session.sessionType} -{" "}
                          {format(new Date(session.sessionDate), "dd MMM yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hidden school ID field */}
            <input type="hidden" {...form.register("schoolId")} />

            {/* Duplicate warning */}
            {duplicateExists && (
              <div className="rounded-lg border border-red-border bg-red-bg p-3 text-sm text-red-base">
                <div className="flex items-center gap-2">
                  <Icons.alertCircle className="h-4 w-4" />
                  <span>A recording already exists for this session</span>
                </div>
              </div>
            )}

            {/* File Upload Area */}
            {canUploadFile && (
              <>
                <Separator />
                <div className="space-y-2">
                  <FormLabel>
                    Audio File <span className="text-shamiri-light-red">*</span>
                  </FormLabel>
                  <label
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                      uploading || validatingFile
                        ? "cursor-not-allowed border-gray-200 bg-gray-50"
                        : "border-gray-300 hover:border-shamiri-new-blue",
                      fileError && "border-red-border",
                    )}
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Icons.check className="h-4 w-4 text-shamiri-green" />
                        <span>{selectedFile.name}</span>
                        <span className="text-gray-500">({formatBytes(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Icons.uploadCloudIcon className="h-8 w-8 text-gray-400" />
                        <div className="text-sm">
                          <span className="font-medium text-shamiri-new-blue">Click to upload</span>
                          {" or drag and drop"}
                        </div>
                        <span className="text-xs text-gray-500">
                          {ALLOWED_EXTENSIONS.join(", ")} (max 500MB)
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(",")}
                      onChange={handleFileInputChange}
                      disabled={uploading || validatingFile}
                      className="hidden"
                    />
                  </label>
                  {fileError && <p className="text-sm text-red-base">{fileError}</p>}
                  {validatingFile && <p className="text-sm text-gray-500">Validating file...</p>}
                </div>
              </>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-shamiri-new-blue transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={!selectedFile || uploading || duplicateExists || validatingFile}
                loading={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
