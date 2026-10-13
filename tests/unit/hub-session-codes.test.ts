// @vitest-environment node
import { describe, expect, it } from "vitest";

import { assignSessionCodes, newSessionTypeDefaults } from "#/lib/app-constants/hub-session-types";

describe("assignSessionCodes", () => {
  it("numbers a new hub's rows by group, intervention from s0 and the rest from 1", () => {
    const rows = [
      { type: "INTERVENTION" as const },
      { type: "SUPERVISION" as const },
      { type: "INTERVENTION" as const },
      { type: "SUPERVISION" as const },
      { type: "DATA_COLLECTION" as const },
    ];
    expect(assignSessionCodes(rows, new Map())).toEqual(["s0", "sv1", "s1", "sv2", "dfu1"]);
  });

  it("keeps stored codes and gives new rows the next index after the highest stored one", () => {
    const stored = new Map([
      ["a", { sessionName: "sv1" }],
      ["b", { sessionName: "sv2" }],
      ["c", { sessionName: "s10" }],
    ]);
    const rows = [
      { sessionNameId: "a", type: "SUPERVISION" as const },
      { sessionNameId: "b", type: "SUPERVISION" as const },
      { sessionNameId: "c", type: "INTERVENTION" as const },
      { type: "SUPERVISION" as const },
      { type: "INTERVENTION" as const },
      { type: "CLINICAL" as const },
    ];
    expect(assignSessionCodes(rows, stored)).toEqual(["sv1", "sv2", "s10", "sv3", "s11", "cl1"]);
  });

  it("reuses the code of a removed last row", () => {
    const stored = new Map([
      ["a", { sessionName: "sv1" }],
      ["b", { sessionName: "sv2" }],
    ]);
    // sv2 was removed, so it is not in the rows.
    const rows = [
      { sessionNameId: "a", type: "SUPERVISION" as const },
      { type: "SUPERVISION" as const },
    ];
    expect(assignSessionCodes(rows, stored)).toEqual(["sv1", "sv2"]);
  });

  it("does not read a supervision code as an intervention one", () => {
    const stored = new Map([["a", { sessionName: "sv9" }]]);
    const rows = [
      { sessionNameId: "a", type: "SUPERVISION" as const },
      { type: "INTERVENTION" as const },
    ];
    expect(assignSessionCodes(rows, stored)).toEqual(["sv9", "s0"]);
  });
});

describe("newSessionTypeDefaults", () => {
  it("uses the standard label and amount when the code has one", () => {
    expect(newSessionTypeDefaults("INTERVENTION", "s0")).toEqual({
      label: "Pre-session",
      amount: 1000,
    });
  });

  it("follows the group's pattern past the standard list", () => {
    expect(newSessionTypeDefaults("SUPERVISION", "sv6")).toEqual({
      label: "Supervision 6",
      amount: 500,
    });
  });

  it("gives groups the standard list leaves out their own label and amount", () => {
    expect(newSessionTypeDefaults("CLINICAL", "cl1")).toEqual({ label: "Clinical 1", amount: 0 });
    expect(newSessionTypeDefaults("DATA_COLLECTION", "dfu1")).toEqual({
      label: "Data Follow Up 1",
      amount: 500,
    });
    expect(newSessionTypeDefaults("INTERVENTION", "s5")).toEqual({
      label: "Session 5",
      amount: 1500,
    });
  });
});
