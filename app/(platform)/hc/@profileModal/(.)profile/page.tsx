import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileFormWrapper from "app/(platform)/new-edit-profile/components/ProfileFormWrapper";
import { GenericFormData } from "app/(platform)/new-edit-profile/components/genericProfile";

export default async function Page() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }
  const allowedGenders = ["Male", "Female"];
  const genderValue: "Male" | "Female" = allowedGenders.includes(
    coordinator.gender ?? "",
  )
    ? (coordinator.gender as "Male" | "Female")
    : "Male";

  const initialData: GenericFormData = {
    email: coordinator.coordinatorEmail ?? "",
    name: coordinator.coordinatorName ?? "",
    idNumber: coordinator.idNumber ?? "",
    cellNumber: coordinator.cellNumber ?? "",
    mpesaNumber: coordinator.mpesaNumber ?? "",
    dateOfBirth: coordinator.dateOfBirth
      ? new Date(coordinator.dateOfBirth).toISOString().split("T")[0]
      : "",
    gender: genderValue,
    county: coordinator.county ?? "",
    subCounty: coordinator.subCounty ?? "",
    bankName: coordinator.bankName ?? "",
    bankBranch: coordinator.bankBranch ?? "",
  };

  return (
    <ProfileFormWrapper initialData={initialData} role="hub-coordinator" />
  );
}
