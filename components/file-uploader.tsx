"use client";

import { readFileContent } from "#/app/(platform)/screenings/[caseId]/components/treatment-plan";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

import { ChangeEvent, useState } from "react";

export default function FileUploader({
  url,
  type,
  metadata,
}: {
  url: string;
  type: string;
  metadata?: {
    hubId: string;
    implementerId: string;
    projectId: string;
    schoolVisibleId?: string;
  };
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  const { toast } = useToast();


  const handleFileUpload = (files: any) => {
    // check if the file is a docx file using mime type
    if (
      files[0].type !== "text/csv"
      //csv
    ) {
      window.alert("Invalid file type. Please upload a csv file");
      return;
    }

    setSelectedFile(files[0]);
  };


  const handleUpload = async () => {
    setError(false);
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      console.error("No file selected");
      return;
    }

    const formData = new FormData();

    const fileContent = await readFileContent(selectedFile);
    formData.append("file", fileContent, selectedFile.name);

    if (metadata && metadata.schoolVisibleId) {
      formData.append("schoolVisibleId", metadata.schoolVisibleId);
      formData.append("hubId", metadata.hubId);
      formData.append("implementerId", metadata.implementerId);
      formData.append("projectId", metadata.projectId);
    }

    try {
      setUploading(true);

      const resp = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();

      if (resp.ok) {
        toast({ title: "File uploaded successfully", variant: "default" });
      } else {
        setError(true);
        toast({ title: data.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);

      toast({
        title:
          `Failed to upload file. Please try again later. ${JSON.stringify(error.message)}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-white text-sm font-semibold leading-5 text-shamiri-black"
        >
          Upload csv
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="text-xl font-semibold leading-7">
          Upload {type} csv
        </DialogHeader>
        <FileUploaderWithDrop
          label="Upload csv file"
          onChange={handleFileUpload}
          files={selectedFile ? [selectedFile] : []}
          accept=".csv"
        />

        <Separator />
        <DialogFooter className="flex justify-end">
          <Button
            className="text-shamiri-new-blue"
            variant="ghost"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || uploading}
            variant="brand"
            onClick={handleUpload}
            className="bg-shamiri-new-blue"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Uploading file..." : <>Submit</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



// file uploader component

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
    // change to array of files
    const files = Array.from(e.target.files);
    if (onChange) onChange(files);
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    setIsDragOver(false);
    // change to array of files
    let files: any;

    if (e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items).map((item: any) =>
        item.getAsFile(),
      );
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    // check allowed file types and filter out
    if (accept && accept !== "*") {
      const allowedTypes = accept.split(",").map((type) => type.substring(1));
      files = files.filter((file: any) =>
        allowedTypes.includes(file.name.split(".").pop()),
      );
    }

    if (files?.length) {
      if (onChange) onChange(files);
    } else {
      window.alert(`Invalid file type. Please upload ${accept} file`);
    }
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  return (
    <div className={clsx(className || "")}>
      {label ? (
        <p className="block text-normal font-medium text-gray-700">{label}</p>
      ) : null}
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
        {/* {files?.length === 0 && <UploadIcon className="app-icon color-gray" />} */}
        {files?.length !== 0 && (
          <div className="flex flex-col items-center space-y-1 text-center text-normal text-gray-700">
            {files.map((file: any) => (
              <span key={file.name}>{file.name}</span>
            ))}
          </div>
        )}
        <span className="mt-2 cursor-pointer text-center text-normal hover:underline">
          {"Upload File"}
        </span>
        <span className="my-2 text-center text-normal text-gray-500">OR</span>
        <span className="text-center text-normal">
          Drag and drop your file here
        </span>
        <input type="file" accept={accept} hidden onChange={handleUpload} />
      </label>
    </div>
  );
}
