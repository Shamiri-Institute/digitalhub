import { currentFellow } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileFormWrapper from "app/(platform)/new-edit-profile/components/ProfileFormWrapper";
import { GenericFormData } from "app/(platform)/new-edit-profile/components/genericProfile";
import { signOut } from "next-auth/react";

export default async function Page() {
  const fellow = await currentFellow();
  if (!fellow) {
    await signOut({ callbackUrl: "/login" });
    return null; 
  }

  const allowedGenders = ["Male", "Female"] as const;
  const genderValue: "Male" | "Female" = allowedGenders.includes(
    fellow.gender as "Male" | "Female",
  )
    ? (fellow.gender as "Male" | "Female")
    : "Male";

  const dateOfBirth: string | undefined = fellow.dateOfBirth
    ? new Date(fellow.dateOfBirth).toISOString().split("T")[0]
    : undefined;

  const initialData: GenericFormData = {
    email: fellow.fellowEmail ?? "",
    name: fellow.fellowName ?? "",
    idNumber: fellow.idNumber ?? "",
    cellNumber: fellow.cellNumber ?? "",
    mpesaNumber: fellow.mpesaNumber ?? "",
    dateOfBirth,
    gender: genderValue,
    county: (fellow.county ?? "Baringo") as GenericFormData["county"],
    subCounty: fellow.subCounty ?? "",
    bankName: "", 
    bankBranch: "", 
  };

  return <ProfileFormWrapper initialData={initialData} role="fellow"/>;
}
