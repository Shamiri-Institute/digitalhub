import { customType } from "drizzle-orm/pg-core";

// node-postgres already parses json and jsonb. Drizzle's own column types parse the result again,
// which turns a stored JSON string such as the option code "1" into the number 1.
function jsonColumn(dataType: "json" | "jsonb") {
  return customType<{ data: unknown; driverData: unknown }>({
    dataType: () => dataType,
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) => value,
  });
}

export const json = jsonColumn("json");
export const jsonb = jsonColumn("jsonb");
