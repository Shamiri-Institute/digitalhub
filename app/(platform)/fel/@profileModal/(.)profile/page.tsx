import { currentFellow } from "#/app/auth";
import { fetchFellowDocuments } from "app/(platform)/fel/actions";
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
  type AllowedGender = (typeof allowedGenders)[number];
  const genderValue: AllowedGender = allowedGenders.includes(
    fellow.gender as AllowedGender,
  )
    ? (fellow.gender as AllowedGender)
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
    county: (fellow.county ?? "") as GenericFormData["county"],
    subCounty: fellow.subCounty ?? "",
    bankName: "",
    bankBranch: "",
  };

  const fellowDocuments = await fetchFellowDocuments();

  return (
    <>
      {!fellow.county && (
        <p style={{ color: "red" }}>
          No county was provided. Please pick the nearest county from the list.
        </p>
      )}
      <ProfileFormWrapper
        initialData={initialData}
        role="fellow"
        fellowDocuments={fellowDocuments}
      />
    </>
  );
}
