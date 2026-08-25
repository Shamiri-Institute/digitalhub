"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icons } from "#/components/icons";

export function FileUploaderWithDrop({
  onChange,
  files,
  className,
  accept = "*",
}: {
  onChange: (files: File[]) => void;
  files: File[];
  className?: string;
  accept?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // change to array of files
    const files = Array.from(e.target.files || []);
    if (onChange) onChange(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    // change to array of files
    let files: File[];

    if (e.dataTransfer.items) {
      files = Array.from(e.dataTransfer.items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
    } else {
      files = Array.from(e.dataTransfer.files);
    }

    // check allowed file types and filter out
    if (accept && accept !== "*") {
      const allowedTypes = accept.split(",").map((type) => type.substring(1));
      files = files.filter((file: File) => allowedTypes.includes(file.name.split(".").pop() || ""));
    }

    if (files?.length) {
      if (onChange) onChange(files);
    } else {
      window.alert(`Invalid file type. Please upload ${accept} file`);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
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
            <span className="text-normal cursor-pointer text-center">{"Select Files"}</span>
          </div>

          <div className="flex space-x-2">
            {files?.length === 0 && <Icons.uploadCloudIcon className="h-6 w-6" />}
            <span className="text-normal text-center">Drop files here...</span>
            <input type="file" accept={accept} hidden onChange={handleUpload} />
          </div>
        </div>
        <div className="mt-3 flex w-full border-t border-gray-500 ">
          {files?.length !== 0 && (
            <div className="text-normal flex items-center space-y-1 pt-2 text-center text-gray-700">
              {files.map((file: File) => (
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
