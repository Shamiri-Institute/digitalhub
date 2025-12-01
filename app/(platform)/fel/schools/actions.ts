"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePageAction(pathname: string, mode?: "layout" | "page") {
  revalidatePath(pathname, mode);
}
