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

export default function FileUploader() {
  const [open, setDialogOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  const { toast } = useToast();

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event?.target?.files) return;

    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file);
    }
  }

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

    try {
      setUploading(true);

      const resp = await fetch("/api/csv-uploads/fellows", {
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
          "Failed to upload file, please check the csv file and try again.",
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
          Upload fellows csv
        </DialogHeader>
        <div
          className={clsx(
            "rounded-lg border border-dotted border-gray-700 p-2",
            error && "border-2 border-shamiri-light-red",
          )}
        >
          <div className="mb-2 flex items-center justify-start space-x-2">
            <Input
              className={clsx(
                "flex-1 cursor-pointer",
                error && "border-shamiri-light-red",
              )}
              id="csv-file"
              name="csv-file"
              type="file"
              accept=".csv"
              placeholder="Select Files"
              onChange={handleFileUpload}
            />

            <div className="flex flex-1 items-center justify-start text-sm font-semibold leading-5 text-gray-500">
              <Icons.uploadCloudIcon className="mr-2 h-4 w-4" />
              Drop files here...
            </div>
          </div>
          <Separator />
          {selectedFile && (
            <>
              <p className="mt-2 text-sm text-gray-500">
                Selected file: {selectedFile.name}, file size:{" "}
                {selectedFile.size} bytes
              </p>
            </>
          )}
        </div>

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
