import { PrismaClient } from "@prisma/client";

declare global {
  var cachedPrisma: PrismaClient;
}

let prisma: PrismaClient;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["info", "warn", "error"],
  });
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient({
      log:
        process.env.DEBUG === "1"
          ? ["query", "info", "warn", "error"]
          : ["info", "warn", "error"],
    });
  }
  prisma = global.cachedPrisma;
}

export const db = prisma;

export type Database = typeof prisma;

export type DefaultCursor = Database;

export type TransactionCursor = Omit<
  Database,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type DatabaseCursor = DefaultCursor | TransactionCursor;
