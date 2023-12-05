import EditProfileBio from "#/app/(platform)/profile/edit-profile/components/edit-bio";
import { currentSupervisor } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

export default async function Page() {
  let supervisor = await currentSupervisor();

  if (!supervisor) {
    return <InvalidPersonnelRole role="supervisor" />;
  }

  return (
    <>
      <EditProfileBio supervisor={supervisor} />
    </>
  );
}
