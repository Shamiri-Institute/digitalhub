"use client";

import { HubCoordinatorProvider } from "#/app/(platform)/hc/context/hub-coordinator";
import { CurrentHubCoordinator } from "#/app/auth";
import { useState } from "react";

export default function HubCoordinator({
  children,
  coordinator,
}: {
  children: React.ReactNode;
  coordinator: CurrentHubCoordinator;
}) {
  const [hubCoordinator, setHubCoordinator] =
    useState<CurrentHubCoordinator>(coordinator);
  return (
    <HubCoordinatorProvider
      value={{
        hubCoordinator,
        setHubCoordinator,
      }}
    >
      {children}
    </HubCoordinatorProvider>
  );
}
