"use server";

import { currentHubCoordinator } from "#/app/auth";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("The session has not been authenticated");
  }
}
