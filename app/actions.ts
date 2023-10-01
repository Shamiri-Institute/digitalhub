"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function inviteUserToOrganization(prevState: any, formData: any) {
  const data = z
    .object({
      emails: z.string().transform((val) => val.split(",")),
      role: z.string(),
    })
    .parse({
      emails: formData.get("emails"),
      role: formData.get("role"),
    });

  console.log({ data });
}
