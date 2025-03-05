import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import ProfileForm from "./profile"; 
import { SupervisorType } from "./schema";

export default async function Page() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  const allowedGenders = ["Male", "Female"];

  const profile: SupervisorType = {
    supervisorEmail: supervisor.supervisorEmail ?? "",
    supervisorName: supervisor.supervisorName ?? "",
    idNumber: supervisor.idNumber ?? "",
    cellNumber: supervisor.cellNumber ?? "",
    mpesaNumber: supervisor.mpesaNumber ?? "",
    county: supervisor.county ?? "",
    subCounty: supervisor.subCounty ?? "",
    bankName: supervisor.bankName ?? "",
    bankBranch: supervisor.bankBranch ?? "",
    dateOfBirth: supervisor.dateOfBirth
      ? new Date(supervisor.dateOfBirth).toISOString().split("T")[0]
      : "", 
    gender: allowedGenders.includes(supervisor.gender ?? "")
      ? (supervisor.gender as "Male" | "Female")
      : "Male", 
  };

  return <ProfileForm initialData={profile} />;
}
