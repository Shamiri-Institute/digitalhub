import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileFormWrapper from "app/(platform)/new-edit-profile/components/ProfileFormWrapper";
import { GenericFormData } from "app/(platform)/new-edit-profile/components/genericProfile";

export default async function Page() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const allowedGenders = ["Male", "Female"] as const;
  const genderValue: "Male" | "Female" = allowedGenders.includes(
    supervisor.gender as "Male" | "Female",
  )
    ? (supervisor.gender as "Male" | "Female")
    : "Male";

  const dateOfBirth: string | undefined = supervisor.dateOfBirth
    ? new Date(supervisor.dateOfBirth).toISOString().split("T")[0]
    : undefined;

  const initialData: GenericFormData = {
    email: supervisor.supervisorEmail ?? "",
    name: supervisor.supervisorName ?? "",
    idNumber: supervisor.idNumber ?? "",
    cellNumber: supervisor.cellNumber ?? "",
    mpesaNumber: supervisor.mpesaNumber ?? "",
    dateOfBirth: dateOfBirth,
    gender: genderValue,
    county: (supervisor.county ?? "Baringo") as GenericFormData["county"],
    subCounty: supervisor.subCounty ?? "",
    bankName: supervisor.bankName ?? "",
    bankBranch: supervisor.bankBranch ?? "",
  };

  return <ProfileFormWrapper initialData={initialData} role="supervisor" />;
}
