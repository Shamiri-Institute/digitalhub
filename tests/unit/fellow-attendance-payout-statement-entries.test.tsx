import { expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";

test.describe("Checking fellow attendance", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("Supervisor can submit a new fellow attendance record, and the payout statement will be generate", () => {
    // given
    // when
    // then
  });

  test("Supervisor can unmark an existing fellow attendance record, and a 'counter' payout statement will be generated", () => {
    // given
    // when
    // then
  });

  test("Supervisor can sumbit a 'not attended' fellow attendance record, and no payout statement will be generated", () => {
    // given
    // when
    // then
  });

  test("Supervisor can mark an existing fello attedance record as not attended, and a counter payout statement will be generated", () => {
    // given
    // when
    // then
  });
});
