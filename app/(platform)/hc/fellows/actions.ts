"use server";

import { currentHubCoordinator, getCurrentUser } from "#/app/auth";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const user = await getCurrentUser();

  if (!hubCoordinator || !user) {
    throw new Error("The session has not been authenticated");
  }
}
