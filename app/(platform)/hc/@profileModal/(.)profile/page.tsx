import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileForm from "./profile"; 
import { HubCoordinatorType } from "./schema";

export default async function Page() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  const allowedGenders = ["Male", "Female"];

  const profile: HubCoordinatorType = {
    coordinatorEmail: hubCoordinator.coordinatorEmail ?? "",
    coordinatorName: hubCoordinator.coordinatorName ?? "",
    idNumber: hubCoordinator.idNumber ?? "",
    cellNumber: hubCoordinator.cellNumber ?? "",
    mpesaNumber: hubCoordinator.mpesaNumber ?? "",
    county: hubCoordinator.county ?? "",
    subCounty: hubCoordinator.subCounty ?? "",
    bankName: hubCoordinator.bankName ?? "",
    bankBranch: hubCoordinator.bankBranch ?? "",
    dateOfBirth: hubCoordinator.dateOfBirth
      ? new Date(hubCoordinator.dateOfBirth).toISOString().split("T")[0]
      : "",
    gender: allowedGenders.includes(hubCoordinator.gender ?? "")
      ? (hubCoordinator.gender as "Male" | "Female")
      : "Male",
  };

  return <ProfileForm initialData={profile} />;
}
