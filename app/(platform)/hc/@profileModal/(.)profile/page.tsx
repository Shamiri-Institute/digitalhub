import { getHubCoordinatorProfileData } from "./actions";
import ProfileForm from "./profile";

export default async function Page() {
  const profile = await getHubCoordinatorProfileData();
  return <ProfileForm initialData={profile} />;
}
