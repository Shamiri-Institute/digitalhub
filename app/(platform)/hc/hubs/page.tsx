import { currentHubCoordinator } from "#/app/auth";

export default async function HubsPage() {
  const hubCoordinator = await currentHubCoordinator();

  console.debug({ hubCoordinator });

  return (
    <main>
      <h1>{hubCoordinator?.assignedHub?.hubName || "No hub assigned"}</h1>
    </main>
  );
}
