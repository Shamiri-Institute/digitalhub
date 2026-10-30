import { redirect } from "next/navigation";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/db/client";
import { env } from "#/env";
import { isSupervisorInFidelityAbTest } from "#/lib/fidelity-ab-test";
import { loadSupervisorRecordings } from "./actions";
import RecordingsDatatable from "./components/recordings-datatable";

// The upload action transcribes the recording in after(), which runs within this page's limit.
export const maxDuration = 800;

async function loadSupervisorFellows(supervisorId: string) {
  return db.query.fellow.findMany({
    where: (f, { and, eq, isNull, or }) =>
      and(eq(f.supervisorId, supervisorId), or(eq(f.droppedOut, false), isNull(f.droppedOut))),
    columns: { id: true, fellowName: true },
    orderBy: (f, { asc }) => asc(f.fellowName),
  });
}

export type SupervisorFellow = Awaited<ReturnType<typeof loadSupervisorFellows>>[number];

export default async function RecordingsPage() {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  if (!supervisor?.profile?.id) {
    return <div>Unauthorized access</div>;
  }

  const [recordings, fellows] = await Promise.all([
    loadSupervisorRecordings(),
    loadSupervisorFellows(supervisor.profile.id),
  ]);

  const transcriptionEnabled = isSupervisorInFidelityAbTest(supervisor.profile.id);
  // A/B uploads skip the Fidelity service while it is not set up, so their Status stays PENDING.
  const fidelityStatusShown = !transcriptionEnabled || !!env.FIDELITY_API_URL;

  return (
    <div className="px-6 py-5">
      <RecordingsDatatable
        data={recordings}
        fellows={fellows}
        transcriptionEnabled={transcriptionEnabled}
        fidelityStatusShown={fidelityStatusShown}
      />
    </div>
  );
}
