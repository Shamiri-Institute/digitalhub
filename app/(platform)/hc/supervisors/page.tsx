import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default async function SupervisorsPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  return (
    <main className="w-full pb-[24px] pt-[20px]">
      <PageHeading title="Supervisors" />
      <Separator className="my-5" />

      <div className="flex items-center justify-between">
        <div className="flex gap-3">{/* search filters go here */}</div>
        <div className="flex items-center gap-3">
          <WeeklyHubTeamMeetingForm
            hubCoordinatorId={hubCoordinator?.id}
            hubId={hubCoordinator?.assignedHubId}
          />
          {/* dispaly options button */}
        </div>
      </div>
      {/* charts goes here */}
      {/* data dable goes here  */}
    </main>
  );
}
