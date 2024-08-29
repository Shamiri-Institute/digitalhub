import { getCurrentUser } from "#/app/auth";
import { FellowSchema } from "./schemas";

export async function addNewFellow(data: FellowSchema) {
  try {
    const supervisor = await getCurrentUser();
    console.log(supervisor);
    console.log(data);

    if (!supervisor) {
      throw new Error("User is not authorised");
    }

    return {
      success: true,
    };
  } catch (error) {
    return { success: false };
  }
}
