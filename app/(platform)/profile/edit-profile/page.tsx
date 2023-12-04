import EditProfileBio from "#/app/(platform)/profile/edit-profile/components/edit-bio";
import { currentSupervisor } from "#/app/auth";

export default async function Page() {
  let supervisor = await currentSupervisor();

  return (
    <>
      <EditProfileBio supervisor={supervisor} />
    </>
  );
}
