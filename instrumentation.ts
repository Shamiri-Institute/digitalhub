// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";
import { constants } from "#/lib/constants";

export async function register() {
  if (constants.NEXT_PUBLIC_ENV === "development") {
    const url = new URL(process.env.DATABASE_URL!);
    const databaseHost = url.hostname;
    const databaseName = url.pathname.slice(1);

    let color = "\x1b[0m"; // Default console color
    if (databaseHost === "localhost") {
      color = "\x1b[32m"; // Green
    } else if (databaseName === "shamiri_db_preview") {
      color = "\x1b[33m"; // Orange
    } else if (databaseName === "shamiri_db") {
      color = "\x1b[31m"; // Red
    }

    const leftPad = " ".repeat(3);
    console.info(`${leftPad}\x1b[34mConnecting to database\x1b[0m`);
    if (databaseHost !== "localhost") {
      console.warn(
        `${leftPad}${color}WARNING: You are connected to the ${
          databaseName.includes("preview") ? "preview" : "production"
        } database!\x1b[0m`,
      );
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
