"use client";

import { revalidatePageAction } from "#/app/(platform)/sc/schools/actions";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { DialogFooter } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { addUploadedSchoolDocs } from "#/lib/actions/file";
import clsx from "clsx";
import { useS3Upload } from "next-s3-upload";

import { useCallback, useState } from "react";

export default function SchoolFilesUploader({
  schoolId,
  onClose,
}: {
  schoolId: string;
  onClose: (val: boolean) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { uploadToS3 } = useS3Upload();

  const { toast } = useToast();

  const handleFileUpload = (files: any) => {
    setSelectedFile(files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      console.error("No file selected");
      return;
    }

    handleFileChange(selectedFile);
  };

  const handleFileChange = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        const { key } = await uploadToS3(file, {
          endpoint: {
            request: {
              url: "/api/files/upload",
              body: {},
              headers: {},
            },
          },
        });

        if (key) {
          const response = await addUploadedSchoolDocs({
            fileName: file.name,
            link: key.toString(),
            visibleId: schoolId,
            type: file.type,
          });
          await revalidatePageAction(`/hc/schools/${schoolId}/files`);

          if (response.success) {
            onClose(false);
            toast({
              title: "File uploaded successfully",
            });
          }
        }
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "File upload error",
          description: "Something went wrong uploading the file",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [uploadToS3],
  );

  return (
    <div className="space-y-5">
      <FileUploaderWithDrop
        label="Upload csv file"
        onChange={handleFileUpload}
        files={selectedFile ? [selectedFile] : []}
        accept="*"
      />

      <Separator />
      <DialogFooter className="flex justify-end">
        <Button
          className="text-shamiri-new-blue"
          variant="ghost"
          onClick={() => onClose(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedFile || uploading}
          variant="brand"
          onClick={handleUpload}
          className="bg-shamiri-new-blue"
          loading={uploading}
        >
          {uploading ? "Uploading file..." : <>Submit</>}
        </Button>
      </DialogFooter>
    </div>
  );
}

function FileUploaderWithDrop({
  label,
  onChange,
  files,
  className,
  accept = "*",
}: {
  label?: string;
  onChange: (e: any) => void;
  files: any[];
  className?: string;
  accept?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = async (e: any) => {
    const files = Array.from(e.target.files);
    if (onChange) onChange(files);
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    setIsDragOver(false);

    let files: any;

    if (e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items).map((item: any) =>
        item.getAsFile(),
      );
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    if (files?.length) {
      if (onChange) onChange(files);
    } else {
      window.alert("Invalid file type.");
    }
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  return (
    <div className={clsx(className || "")}>
      <label
        id="drop_zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        className={clsx(
          "mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-3",
          isDragOver ? "border-secondary" : "border-gray-200",
        )}
      >
        <div className=" flex w-full items-center space-x-6">
          <div className="cursor-pointer rounded-lg border border-gray-200 p-2">
            <span className="text-normal cursor-pointer text-center">
              {"Select Files"}
            </span>
          </div>

          <div className="flex space-x-2">
            {files?.length === 0 && (
              <Icons.uploadCloudIcon className="h-6 w-6" />
            )}
            <span className="text-normal text-center">Drop files here...</span>
            <input type="file" accept={accept} hidden onChange={handleUpload} />
          </div>
        </div>
        <div className="mt-3 flex w-full border-t border-gray-500 ">
          {files?.length !== 0 && (
            <div className="text-normal flex items-center space-y-1 pt-2 text-center text-gray-700">
              {files.map((file: any, index) => (
                <div key={file.name} className="flex items-center space-x-2">
                  <Icons.check className="h-4 w-4" />
                  <span key={file.name}>{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
