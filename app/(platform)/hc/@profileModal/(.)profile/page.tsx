import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileFormWrapper from "#/components/common/profile/profile-form-wrapper";
import { GenericFormData } from "#/components/common/profile/generic-profile";

export default async function Page() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  const allowedGenders = ["Male", "Female"] as const;
  const genderValue: "Male" | "Female" = allowedGenders.includes(
    coordinator.gender as "Male" | "Female",
  )
    ? (coordinator.gender as "Male" | "Female")
    : "Male";

  const dateOfBirthString = coordinator.dateOfBirth
    ? new Date(coordinator.dateOfBirth).toISOString().split("T")[0]
    : "";

  const initialData: GenericFormData = {
    email: coordinator.coordinatorEmail ?? "",
    name: coordinator.coordinatorName ?? "",
    idNumber: coordinator.idNumber ?? "",
    cellNumber: coordinator.cellNumber ?? "",
    mpesaNumber: coordinator.mpesaNumber ?? "",
    dateOfBirth: dateOfBirthString,
    gender: genderValue,
    county: (coordinator.county ?? "Baringo") as GenericFormData["county"],
    subCounty: coordinator.subCounty ?? "",
    bankName: coordinator.bankName ?? "",
    bankBranch: coordinator.bankBranch ?? "",
  };

  return (
    <ProfileFormWrapper initialData={initialData} role="hub-coordinator" />
  );
}
