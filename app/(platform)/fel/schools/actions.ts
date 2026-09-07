"use server";

import { revalidatePath } from "next/cache";

import { requireAuthRole } from "#/lib/auth/require-auth-role";

export async function revalidatePageAction(pathname: string, mode?: "layout" | "page") {
  await requireAuthRole();
  revalidatePath(pathname, mode);
}
