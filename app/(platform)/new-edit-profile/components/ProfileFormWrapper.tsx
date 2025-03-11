"use client";

import { updateHubCoordinatorProfile } from "app/(platform)/hc/actions";
import { updateSupervisorProfile } from "app/(platform)/sc/actions";
import GenericProfileForm, { GenericFormData } from "./genericProfile";

type ProfileFormWrapperProps = {
  role: "supervisor" | "hub-coordinator";
  initialData: GenericFormData;
};

export default function ProfileFormWrapper({
  initialData,
  role,
}: ProfileFormWrapperProps) {
  async function onSubmit(data: GenericFormData) {
    if (role === "supervisor") {
      const transformedData = {
        supervisorEmail: data.email,
        supervisorName: data.name,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as "Male" | "Female",
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
      };

      const result = await updateSupervisorProfile(transformedData);
      if (!result?.success) {
        throw new Error(result?.message ?? "Profile update failed");
      }
    } else if (role === "hub-coordinator") {
      const transformedData = {
        coordinatorEmail: data.email,
        coordinatorName: data.name,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender as "Male" | "Female",
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
      };

      const result = await updateHubCoordinatorProfile(transformedData);
      if (!result?.success) {
        throw new Error(result?.message ?? "Profile update failed");
      }
    }
  }

  return <GenericProfileForm initialData={initialData} onSubmit={onSubmit} />;
}
