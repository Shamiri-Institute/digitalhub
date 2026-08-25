const supervisorIds = new Set(
  (process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isSupervisorInFidelityAbTest(supervisorId: string): boolean {
  return supervisorIds.has(supervisorId);
}
