// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { constants } from "#/lib/constants";

export function register() {
  if (constants.NEXT_PUBLIC_ENV === "development") {
    const url = new URL(process.env.DATABASE_URL!);
    const databaseHost = url.hostname;
    const databaseName = url.pathname.slice(1);

    let color = "\x1b[0m";
    if (databaseHost === "localhost") {
      color = "\x1b[32m";
    } else if (databaseName === "shamiri_db_preview") {
      color = "\x1b[33m";
    } else if (databaseName === "shamiri_db") {
      color = "\x1b[31m";
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
}
