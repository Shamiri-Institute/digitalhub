import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import { loadHubRecordings } from "./actions";
import RecordingsDatatable from "./components/recordings-datatable";

export default async function RecordingsPage() {
  const hc = await currentHubCoordinator();
  if (hc === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!hc?.profile?.id) {
    return <div>Unauthorized access</div>;
  }

  const recordings = await loadHubRecordings();

  return (
    <div className="px-6 py-5">
      <RecordingsDatatable data={recordings} />
    </div>
  );
}
