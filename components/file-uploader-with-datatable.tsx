"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { readFileContent } from "#/utils/file-utils";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { useToast } from "#/components/ui/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

import { useState } from "react";

let columns: ColumnDef<string, string>[] = [
  {
    accessorKey: "school_name",
    header: "School name",
  },
  {
    accessorKey: "presession_date",
    header: "Pre session date",
  },
  {
    accessorKey: "numbers_expected",
    header: "Expected students",
  },
  {
    accessorKey: "available_fellows",
    header: "Available fellows",
  },
  {
    accessorKey: "fellows_needed",
    header: "Fellows needed",
  },
];

export default function FileUploaderWithDataTable({
  url,
  type,
  metadata,
  uploadVisibleMessage,
}: {
  url: string;
  type: string;
  metadata?: {
    hubId?: string;
    implementerId?: string;
    projectId?: string;
    schoolVisibleId?: string;
    urlPath?: string;
  };
  uploadVisibleMessage?: string;
}) {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [dataTableOpen, setDataTableOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [errorMessages, setErrorMessage] = useState<string[]>([]);

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

    if (metadata) {
      formData.append("schoolVisibleId", metadata?.schoolVisibleId!);
      formData.append("hubId", metadata.hubId ?? "");
      formData.append("implementerId", metadata.implementerId ?? "");
      formData.append("projectId", metadata.projectId ?? "");
      formData.append("urlPath", metadata.urlPath!);
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
        setDialogOpen(false);
        revalidatePageAction(metadata?.urlPath!);
      } else {
        setError(true);
        const { formatedData, errorMessages } = data.errors.reduce(
          (acc: { formatedData: any[]; errorMessages: string[] }, row: any) => {
            acc.formatedData.push(row?.rowData);
            acc.errorMessages.push(
              `Row ${row?.rowNumber}: ${row?.rowData?.schoolName} ${row?.error}`,
            );
            return acc;
          },
          { formatedData: [], errorMessages: [] },
        );

        setErrorMessage(errorMessages);
        setData(formatedData);
        setDataTableOpen(true);

        toast({ title: data.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to upload file:", error);

      toast({
        title:
          // @ts-ignore
          `Failed to upload file. Please try again later. ${JSON.stringify(error?.message)}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-white text-sm font-semibold leading-5 text-shamiri-black"
          >
            <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
            {uploadVisibleMessage ? uploadVisibleMessage : `Upload ${type} CSV`}
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
      <DataTableDialog
        title="Upload has been rejected"
        columns={columns}
        data={data}
        dataTableOpen={dataTableOpen}
        setDataTableOpen={setDataTableOpen}
        errorMessages={errorMessages}
      />
    </>
  );
}

export function FileUploaderWithDrop({
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

export function DataTableDialog({
  title,
  columns,
  data,
  dataTableOpen,
  setDataTableOpen,
  errorMessages,
}: {
  title: string;
  columns: ColumnDef<string, string>[];
  data: any[];
  dataTableOpen: boolean;
  setDataTableOpen: (open: boolean) => void;
  errorMessages: string[];
}) {
  return (
    <Dialog open={dataTableOpen} onOpenChange={setDataTableOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {errorMessages.length > 0 &&
          errorMessages.map((message, index) => (
            <DialogAlertWidget
              variant="destructive"
              key={index}
              label={message}
            />
          ))}
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={data}
            emptyStateMessage="No data to display"
            editColumns={false}
            className="data-table data-table-action lg:mt-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
