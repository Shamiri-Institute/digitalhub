import { signOut } from "next-auth/react";
import { Suspense } from "react";
import { getTriageEventsForSupervisor } from "#/app/(platform)/sc/triage/action";
import FellowActivitySection from "#/app/(platform)/sc/triage/components/fellow-activity-section";
import RequiresActionSection from "#/app/(platform)/sc/triage/components/requires-action-section";
import TriagePageLoading from "#/app/(platform)/sc/triage/loading";
import { currentSupervisor } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

async function TriageContent() {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  const events = await getTriageEventsForSupervisor();
  const supervisorId = supervisor.profile.id;

  return (
    <div className="space-y-8">
      <RequiresActionSection events={events} />
      <Separator />
      <FellowActivitySection events={events} supervisorId={supervisorId} />
    </div>
  );
}

export default function TriagePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Triage" />
        <Separator />
        <Suspense fallback={<TriagePageLoading />}>
          <TriageContent />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
