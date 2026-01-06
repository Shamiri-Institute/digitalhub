import type { riskStatusOptions } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import type { Metadata } from "next";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  const words = name.split(" ");
  const firstInitial = words[0]?.charAt(0).toUpperCase() ?? "";
  const lastInitial = words[words.length - 1]?.charAt(0).toUpperCase() ?? "";
  return firstInitial + lastInitial;
}

export function getSchoolInitials(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .filter((i) => i.toLowerCase() !== "school")
      .map((i) => i[0]?.toUpperCase())
      .join("") ?? "N/A"
  );
}

export function constructMetadata({
  title = "Shamiri Digital Hub ",
  description = "The Shamiri Digital Hub is a platform for managing the Shamiri Intervention.",
}: {
  title?: string;
  description?: string;
} = {}): Metadata {
  return {
    title,
    description,
  };
}

export function getHighestValue(data: { [k: string]: string }): riskStatusOptions {
  const values = Object.values(data);

  if (values.includes("High")) {
    return "High";
  }
  if (values.includes("Med")) {
    return "Medium";
  }
  if (values.includes("Low")) {
    return "Low";
  }
  return "No";
}

export function stringValidation(message: string | undefined = "Required*") {
  return z.string({ error: message }).trim().min(1, { error: message });
}

export function sessionDisplayName(sessionType?: string) {
  switch (sessionType) {
    case "s0":
      return "Pre";
    case "s1":
      return "S1";
    case "s2":
      return "S2";
    case "s3":
      return "S3";
    case "s4":
      return "S4";
    default:
      return sessionType?.toUpperCase();
  }
}

export function generateFellowVisibleID(lastNumber: number): string {
  // Get current year
  const currentYear: number = new Date().getFullYear();

  // Extract last two digits of the current year
  const yearDigits: string = String(currentYear).slice(-2);

  // First part
  const part1 = `TFW${yearDigits}`;

  // Second part
  const part2 = "S";

  // Third part
  const newNumber = lastNumber + 1;
  let part3: string = newNumber.toString().padStart(3, "0");
  if (newNumber >= 1000) {
    part3 = newNumber.toString().padStart(4, "0");
  }

  return `${part1}_${part2}_${part3}`;
}

export function generateStudentVisibleID(groupName: string, lastNumber: number) {
  return `${groupName}_${lastNumber}`;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export function handleMinutesChange(value: string): string {
  const numericValue = Number.parseInt(value, 10);
  if (Number.isNaN(numericValue)) return "00";
  if (numericValue < 0) return "00";
  if (numericValue > 59) return "59";
  return numericValue.toString().padStart(2, "0");
}
