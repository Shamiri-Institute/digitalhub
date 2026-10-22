---
name: verify-fellow-attendance-payout
description: >-
  Checks the fellow attendance payout net with TLC. Use when editing
  attendancePayoutChange, markFellowAttendance, markManyFellowAttendance,
  triggerPayoutAction, or the session amount written by updateHub.
---

# Verify fellow attendance payout

A marked fellow is paid the rate from the mark that is still in effect. An unmark brings the net of that attendance's statements back to zero, including after an admin changes the session rate. A wrong net overpays or underpays the fellow when operations runs payouts.

## Run

From the repo root:

```bash
bash .agents/skills/verify-fellow-attendance-payout/check.sh
```

The script needs Java. On first run it downloads TLC 2.19 (`tla2tools.jar` from the TLA+ 1.7.4 release) into `.cache` and checks the sha256. A pass prints `No error has been found` and exits 0. The last measured run found 114 distinct states and finished in under a second.

To see the check fail, run:

```bash
bash .agents/skills/verify-fellow-attendance-payout/check.sh --bug
```

That config must exit non-zero. A pass on `--bug` means the check can no longer see a bad unmark.

## Covered code

Confirmed against `2e4ff5144b64fb0f1c53cb1eaec393e52473f3dc`. Move that commit forward only after you confirm the spec still describes the code at the new commit.

| Action in `AttendancePayout.tla` | Code |
| --- | --- |
| `CreateAttendance` | Insert branch of `markFellowAttendance` and `markManyFellowAttendance` in `lib/actions/fellow/index.ts`. A new attended row writes one `MARK_SESSION_ATTENDANCE` at `sessionRate`. A miss writes no statement. |
| `SetAttendance` | `attendancePayoutChange` in that file, called from the update branch of both functions. The unmark amount is `paid === 0 ? 0 : -paid`. Callers pass the session rate only when marking, and `0` when unmarking. |
| `ChangeRate` | `updateHub` in `lib/actions/admin/hubs.ts` sets `session_names.amount`. |
| `TriggerPayout` | `triggerPayoutAction` in `app/(platform)/ops/reporting/expenses/payout-history/actions.ts` sets `executedAt` and `processedAt` together when the row is attended and has a statement. |

`UnmarkByNet` in `AttendancePayout.cfg` must stay `TRUE`. That constant is the unmark formula. `FALSE` is only `AttendancePayoutBug.cfg`.

## When the check fails

`Balance` failed. Read the TLC states in order. Each state is one of the four actions above.

If `SetAttendance` still matches `attendancePayoutChange`, the failure is a bug in the product code. Report the trace in those function names. Do not edit `Balance`, and do not set `UnmarkByNet` to `FALSE`, to force a pass.

If the function changed on purpose, change `SetAttendance` to the new formula before you rerun. Write down the old formula, the new formula, and the evidence that the promise changed (the comment on `attendancePayoutChange`, a test, or the commit message). Then run `check.sh` again.

## Scope

The model is one fellow and one session. Rates are `0`, `1`, and `2`. A trace has at most 4 statements. The serializable transaction is one step. A serialization failure writes nothing, so it is not a separate step.

Left out:

- `confirmPayoutAction`. It does not change amounts or `attended`.
- Which hubs an operations user can pay.
- Dropout, a missing session type, and the treatment-group check. Those paths throw before a statement is written.
- Two attendance rows. The net is per row.
- Traces longer than 4 statements.

## After a change

1. Read the diff of the four functions in the table.
2. If a step in the code is no longer the same formula as its action, edit the action. Keep one database transaction as one action.
3. Run `check.sh`.
4. If it passes and the spec matches the new code, set the sync commit in this file to that commit.
