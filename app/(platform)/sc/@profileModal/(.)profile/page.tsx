import { getSupervisorProfileData } from "./actions";
import ProfileForm from "./profile";

export default async function Page() {
  const profile = await getSupervisorProfileData();
  return <ProfileForm initialData={profile} />;
}
