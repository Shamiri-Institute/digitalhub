import { Input } from "#/components/ui/input";
import { ChangeEvent, useState } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { useToast } from "#/components/ui/use-toast";
import { CurrentCase } from "#/app/(platform)/screenings/screen";

export function TreatmentPlan({ currentcase }: {
  currentcase: CurrentCase;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {

    if (!event?.target?.files) return;

    const file = event.target.files[0]; // Get the first selected file
    if (file) {
      // Perform operations with the selected file
      console.log("Selected file:", file);
      setSelectedFile(file);

    }
  }

  const handleUpload = async () => {

    if (!selectedFile) {
      console.error("No file selected");
      return;
    }

    // Perform file upload
    console.log("Uploading file:", selectedFile);
    const formData = new FormData();
    // formData.append("file", selectedFile);
    formData.append("studentId", currentcase.student.id);
    formData.append("schoolId", currentcase.student.schoolId!);

    // Read the file content
    const fileContent = await readFileContent(selectedFile);

    // Append the file content to the FormData object
    formData.append("file", fileContent, selectedFile.name);
    console.log(formData);
    try {
      // const resp = await uploadTreatmentPlan(formData);
      console.log("oaddu");

      const resp = await fetch("/api/files/gdrive", {
        method: "POST",
        body: formData,
      })


      // if (resp.ok) {
      //   toast({ title: "File uploaded successfully", variant: "default" });
      // } else {
      //   toast({ title: "Failed to upload file", variant: "destructive" });
      // }

      // console.log({ resp });

    } catch (error) {
      console.error("Failed to upload file:", error);
    }

  }

  return (
    <>
      <Input className="cursor-pointer" id="docx-file" name="docx-file" type="file" accept=".doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileUpload}
      />
      {/* <p className="text-sm text-gray-500 mt-2">Select a .doc or .docx file to upload</p> */}
      {
        selectedFile &&
        <>
          <p className="text-sm text-gray-500 mt-2">Selected file: {selectedFile.name}</p>
          <p className="text-sm text-gray-500 mt-2">File size: {selectedFile.size} bytes</p>
        </>
      }
      <Button
        disabled={!selectedFile}
        onClick={handleUpload}
        type="submit"
        className="hover:bg-shamiri-brand mt-2 w-full rounded-sm bg-shamiri-blue px-3 py-2 text-white">
        <Icons.upload className="mr-2 h-4 w-4" />
        Upload File
      </Button>
    </>
  );
}


export function readFileContent(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result], { type: file.type }));
      } else {
        reject(new Error("Failed to read file content"));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
}