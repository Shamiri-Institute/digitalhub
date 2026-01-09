import { signOut } from "next-auth/react";
import { loadSupervisorRecordings } from "./actions";
import { currentSupervisor } from "#/app/auth";
import RecordingsDatatable from "./components/recordings-datatable";

export default async function RecordingsPage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.profile?.id) {
    return <div>Unauthorized access</div>;
  }

  const recordings = await loadSupervisorRecordings();

  return (
    <div className="px-6 py-5">
      <RecordingsDatatable data={recordings} />
    </div>
  );
}
