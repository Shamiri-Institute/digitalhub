// @vitest-environment node
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "#/db/schema";
import { TypeID } from "typeid-js";

/**
 * Every id column that generates its own value must produce a prefixed TypeID, whose suffix is a
 * UUID version 7. Version 7 is time-ordered, so new primary keys land at the end of the index
 * instead of scattering across it. The earlier `randomUUID()` default, a version 4, did not.
 */

/** The base32 alphabet TypeID uses: Crockford without i, l, o and u. */
const TYPEID = /^([a-z]+)_([0-9a-hjkmnp-tv-z]{26})$/;

const generatedIds = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .flatMap((table) => {
    const { name, columns } = getTableConfig(table as PgTable);
    return columns
      .filter((column) => column.name === "id" && typeof column.defaultFn === "function")
      .map((column) => ({ table: name, generate: () => String(column.defaultFn?.()) }));
  });

describe("generated id columns", () => {
  it("covers every table that generates its own id", () => {
    expect(generatedIds.length).toBe(43);
  });

  it.each(generatedIds)("$table generates a prefixed uuid v7", ({ generate }) => {
    const id = generate();
    const match = TYPEID.exec(id);
    expect(match, `${id} is not a prefixed TypeID`).not.toBeNull();

    const uuid = TypeID.fromString(id).toUUID();
    expect(uuid[14], `${id} decodes to ${uuid}, which is not version 7`).toBe("7");
  });

  it("generates ids that sort in the order they were created", () => {
    const first = generatedIds[0];
    if (!first) throw new Error("no generated id columns found");
    const ids = Array.from({ length: 50 }, () => first.generate());
    expect(ids).toStrictEqual(ids.toSorted());
  });
});
