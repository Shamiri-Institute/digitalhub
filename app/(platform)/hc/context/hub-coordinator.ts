"use client";

import { CurrentHubCoordinator } from "#/app/auth";
import React from "react";

const HubCoordinatorContext = React.createContext({
  hubCoordinator: {} as CurrentHubCoordinator,
  setHubCoordinator: (hc: CurrentHubCoordinator) => {},
});

export const HubCoordinatorProvider = HubCoordinatorContext.Provider;

export default HubCoordinatorContext;
