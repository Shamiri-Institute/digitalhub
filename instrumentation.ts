// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";
import { constants } from "#/lib/constants";

export async function register() {
  if (constants.NEXT_PUBLIC_ENV === "development") {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const databaseHost = url.hostname;
    const databaseName = url.pathname.slice(1);

    const color = databaseHost === "localhost" ? "\x1b[32m" : "\x1b[0m"; // Green for local, default otherwise

    const leftPad = " ".repeat(3);
    console.info(`${leftPad}\x1b[34mConnecting to database\x1b[0m`);
    if (databaseHost !== "localhost") {
      console.warn(`${leftPad}${color}WARNING: You are connected to a remote database!\x1b[0m`);
    }
    console.log(`${leftPad}${color}Database host: ${databaseHost}\x1b[0m`);
    console.log(`${leftPad}${color}Database name: ${databaseName}\x1b[0m`);
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
