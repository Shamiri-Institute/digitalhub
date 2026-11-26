const supervisorIds = new Set(
  (process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isSupervisorInFidelityAbTest(supervisorId: string): boolean {
  // "*" puts every supervisor in the test; staging sets it so any test upload is transcribed.
  return supervisorIds.has("*") || supervisorIds.has(supervisorId);
}
